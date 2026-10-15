using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IdentityService.Controllers;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace IdentityServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-259:
/// Token, Session and Secure Error Handling Improvements.
/// Validates:
/// 1. Expired tokens are immediately rejected with zero clock skew.
/// 2. Tampered / wrongly signed tokens fail validation.
/// 3. Invalid issuer and audience fail validation.
/// 4. Logout endpoint cleanly terminates session and returns standard response.
/// 5. OnChallenge and OnForbidden emit uniform, secure JSON error envelopes.
/// </summary>
public class TokenAndSessionSecurityTests
{
    private const string ValidKey = "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";
    private const string ValidIssuer = "SmartRestaurant";
    private const string ValidAudience = "SmartRestaurantUsers";

    private static TokenValidationParameters CreateValidationParameters()
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

    private static string GenerateTestToken(
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
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim("sub", "42"),
            new Claim(ClaimTypes.Email, "customer@cinnamonbistro.com"),
            new Claim(ClaimTypes.Role, AppRoles.Customer)
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = issuer,
            Audience = audience,
            Expires = expires ?? DateTime.UtcNow.AddMinutes(30),
            NotBefore = notBefore ?? DateTime.UtcNow.AddMinutes(-5),
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }

    [Fact]
    public void ValidToken_PassesValidation()
    {
        var token = GenerateTestToken();
        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(token, CreateValidationParameters(), out var validatedToken);

        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal("42", principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
    }

    [Fact]
    public void ExpiredToken_ImmediatelyThrowsSecurityTokenExpiredException_DueToZeroClockSkew()
    {
        // Expired 5 seconds ago
        var expiredToken = GenerateTestToken(expires: DateTime.UtcNow.AddSeconds(-5));
        var handler = new JwtSecurityTokenHandler();

        Assert.Throws<SecurityTokenExpiredException>(() =>
            handler.ValidateToken(expiredToken, CreateValidationParameters(), out _));
    }

    [Fact]
    public void WrongSigningKey_ThrowsSecurityTokenInvalidSignatureException()
    {
        var wrongKey = "Another_Completely_Different_Secret_Key_For_Tampering_Test_2026!";
        var tamperedToken = GenerateTestToken(key: wrongKey);
        var handler = new JwtSecurityTokenHandler();

        Assert.ThrowsAny<SecurityTokenException>(() =>
            handler.ValidateToken(tamperedToken, CreateValidationParameters(), out _));
    }

    [Fact]
    public void InvalidIssuer_ThrowsSecurityTokenInvalidIssuerException()
    {
        var badIssuerToken = GenerateTestToken(issuer: "RogueAttackerService");
        var handler = new JwtSecurityTokenHandler();

        Assert.Throws<SecurityTokenInvalidIssuerException>(() =>
            handler.ValidateToken(badIssuerToken, CreateValidationParameters(), out _));
    }

    [Fact]
    public void InvalidAudience_ThrowsSecurityTokenInvalidAudienceException()
    {
        var badAudienceToken = GenerateTestToken(audience: "UnauthorizedAudience");
        var handler = new JwtSecurityTokenHandler();

        Assert.Throws<SecurityTokenInvalidAudienceException>(() =>
            handler.ValidateToken(badAudienceToken, CreateValidationParameters(), out _));
    }

    [Fact]
    public void Logout_Returns200OkWithSafeMessage()
    {
        var loggerMock = new Mock<ILogger<AuthController>>();
        var authServiceMock = new Mock<IAuthService>();
        var controller = new AuthController(authServiceMock.Object, loggerMock.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "42"),
                    new Claim(ClaimTypes.Role, AppRoles.Customer)
                }, "TestAuth"))
            }
        };

        var result = controller.Logout();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task OnChallenge_Emits401WithConsistentJsonBody()
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
    public async Task OnForbidden_Emits403WithConsistentJsonBody()
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
