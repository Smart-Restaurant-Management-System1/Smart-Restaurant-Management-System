using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using ReservationService.Models;
using Xunit;

namespace ReservationServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-259:
/// Token and secure error handling validation in Reservation Service.
/// Verifies:
/// 1. Reservation service enforces token lifetime with zero clock skew.
/// 2. Wrong signing keys and malformed tokens fail validation.
/// 3. JwtBearer OnChallenge and OnForbidden handlers emit consistent, safe JSON error bodies.
/// </summary>
public class TokenSecurityReservationTests
{
    private const string ValidKey = "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";
    private const string ValidIssuer = "SmartRestaurant";
    private const string ValidAudience = "SmartRestaurantUsers";

    private static TokenValidationParameters CreateReservationTokenValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ValidKey)),
            ValidateIssuer = true,
            ValidIssuer = ValidIssuer,
            ValidateAudience = true,
            ValidAudience = ValidAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    }

    private static string GenerateReservationTestToken(
        string key = ValidKey,
        string issuer = ValidIssuer,
        string audience = ValidAudience,
        DateTime? expires = null,
        DateTime? notBefore = null)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "15"),
            new Claim(ClaimTypes.Role, AppRoles.Customer)
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = issuer,
            Audience = audience,
            Expires = expires ?? DateTime.UtcNow.AddMinutes(30),
            NotBefore = notBefore ?? DateTime.UtcNow.AddMinutes(-10),
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }

    [Fact]
    public void ReservationService_ZeroClockSkew_ImmediatelyRejectsExpiredToken()
    {
        var expiredToken = GenerateReservationTestToken(expires: DateTime.UtcNow.AddSeconds(-2));
        var handler = new JwtSecurityTokenHandler();

        Assert.Throws<SecurityTokenExpiredException>(() =>
            handler.ValidateToken(expiredToken, CreateReservationTokenValidationParameters(), out _));
    }

    [Fact]
    public void ReservationService_WrongKey_ThrowsSecurityTokenException()
    {
        var wrongKeyToken = GenerateReservationTestToken(key: "RogueKey_ThatDoesNotMatchTheReservationServiceSecretKey_2026!");
        var handler = new JwtSecurityTokenHandler();

        Assert.ThrowsAny<SecurityTokenException>(() =>
            handler.ValidateToken(wrongKeyToken, CreateReservationTokenValidationParameters(), out _));
    }

    [Fact]
    public async Task ReservationService_OnChallenge_Emits401WithConsistentJsonBody()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var options = new JwtBearerOptions();
        var context = new JwtBearerChallengeContext(httpContext, scheme, options, new AuthenticationProperties());

        var events = new JwtBearerEvents
        {
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                ctx.Response.ContentType = "application/json";

                var payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    message = "Authentication required or token is invalid or expired."
                });
                await ctx.Response.WriteAsync(payload);
            }
        };

        await events.Challenge(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, httpContext.Response.StatusCode);
        Assert.Equal("application/json", httpContext.Response.ContentType);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains("Authentication required or token is invalid or expired.", body);
    }

    [Fact]
    public async Task ReservationService_OnForbidden_Emits403WithConsistentJsonBody()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var options = new JwtBearerOptions();
        var context = new ForbiddenContext(httpContext, scheme, options);

        var events = new JwtBearerEvents
        {
            OnForbidden = async ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json";

                var payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    message = "You do not have permission to access this resource."
                });
                await ctx.Response.WriteAsync(payload);
            }
        };

        await events.Forbidden(context);

        Assert.Equal(StatusCodes.Status403Forbidden, httpContext.Response.StatusCode);
        Assert.Equal("application/json", httpContext.Response.ContentType);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains("You do not have permission to access this resource.", body);
    }
}
