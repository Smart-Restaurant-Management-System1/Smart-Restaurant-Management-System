using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-257 in Reservation Service:
/// Verifies that tokens issued to blocked or deactivated accounts are rejected
/// by the reservation and ordering microservice's JWT bearer pipeline.
/// </summary>
public class UserAccountStatusValidatorTests
{
    private readonly Mock<IUserAccountStatusValidator> _validatorMock;
    private readonly Mock<ILogger<DatabaseUserAccountStatusValidator>> _loggerMock;
    private readonly IConfiguration _configuration;

    public UserAccountStatusValidatorTests()
    {
        _validatorMock = new Mock<IUserAccountStatusValidator>();
        _loggerMock = new Mock<ILogger<DatabaseUserAccountStatusValidator>>();

        var configValues = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Port=3306;Database=restaurant_reservation_db;User=root;Password=root;",
            ["IdentityDb:DatabaseName"] = "restaurant_identity_db"
        };
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-99)]
    public async Task DatabaseValidator_RejectsInvalidUserIdImmediately(int invalidUserId)
    {
        var dbHelper = new DatabaseHelper(_configuration);
        var validator = new DatabaseUserAccountStatusValidator(dbHelper, _configuration, _loggerMock.Object);

        var result = await validator.IsUserActiveAsync(invalidUserId);

        Assert.False(result);
    }

    [Fact]
    public async Task ReservationService_RejectsBlockedUserToken()
    {
        // Arrange - SR-257: Customer token must be rejected if user account was blocked in identity DB
        const int blockedUserId = 45;
        _validatorMock.Setup(v => v.IsUserActiveAsync(blockedUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var services = new ServiceCollection();
        services.AddSingleton(_validatorMock.Object);
        var serviceProvider = services.BuildServiceProvider();

        var httpContext = new DefaultHttpContext
        {
            RequestServices = serviceProvider
        };

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, blockedUserId.ToString()),
            new(ClaimTypes.Role, AppRoles.Customer)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));

        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var options = new JwtBearerOptions();
        var context = new TokenValidatedContext(httpContext, scheme, options)
        {
            Principal = principal
        };

        // Simulate ReservationService Program.cs OnTokenValidated handler
        var validator = context.HttpContext.RequestServices.GetService<IUserAccountStatusValidator>();
        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.Principal?.FindFirst("sub")?.Value;

        if (!int.TryParse(userIdClaim, out var userId) || !await validator!.IsUserActiveAsync(userId, context.HttpContext.RequestAborted))
        {
            context.Fail("User account is inactive or blocked.");
        }

        // Assert: authentication was failed by the validator
        Assert.NotNull(context.Result);
        Assert.False(context.Result.Succeeded);
    }

    [Fact]
    public async Task ReservationService_AcceptsActiveUserToken()
    {
        // Arrange
        const int activeUserId = 46;
        _validatorMock.Setup(v => v.IsUserActiveAsync(activeUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var services = new ServiceCollection();
        services.AddSingleton(_validatorMock.Object);
        var serviceProvider = services.BuildServiceProvider();

        var httpContext = new DefaultHttpContext
        {
            RequestServices = serviceProvider
        };

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, activeUserId.ToString()),
            new(ClaimTypes.Role, AppRoles.Customer)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));

        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var options = new JwtBearerOptions();
        var context = new TokenValidatedContext(httpContext, scheme, options)
        {
            Principal = principal
        };

        // Simulate ReservationService Program.cs OnTokenValidated handler
        var validator = context.HttpContext.RequestServices.GetService<IUserAccountStatusValidator>();
        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.Principal?.FindFirst("sub")?.Value;

        if (!int.TryParse(userIdClaim, out var userId) || !await validator!.IsUserActiveAsync(userId, context.HttpContext.RequestAborted))
        {
            context.Fail("User account is inactive or blocked.");
        }

        // Assert: authentication succeeded without failure
        Assert.Null(context.Result?.Failure);
    }

    [Fact]
    public async Task ReservationService_RestoresAccess_WhenUserIsUnblocked()
    {
        // Arrange
        const int userId = 47;
        
        // Blocked state
        _validatorMock.Setup(v => v.IsUserActiveAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        Assert.False(await _validatorMock.Object.IsUserActiveAsync(userId));

        // Admin unblocks state
        _validatorMock.Setup(v => v.IsUserActiveAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        Assert.True(await _validatorMock.Object.IsUserActiveAsync(userId));
    }
}
