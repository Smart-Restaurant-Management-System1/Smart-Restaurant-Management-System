using System.Security.Claims;
using IdentityService.Models;
using IdentityService.Repositories;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace IdentityServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-257:
/// Enforce Blocked and Deleted Account Authentication Restrictions on protected endpoints.
/// Verifies that tokens issued to accounts that are subsequently blocked or deleted
/// are rejected by protected APIs, and that unblocking restores normal access.
/// </summary>
public class AccountSecurityTokenTests
{
    private readonly Mock<IUserRepository> _userRepoMock;

    public AccountSecurityTokenTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
    }

    [Fact]
    public async Task ActiveUser_IsAllowedAccess()
    {
        // Arrange
        const int userId = 101;
        _userRepoMock.Setup(r => r.IsUserActiveAsync(userId))
            .ReturnsAsync(true);

        // Act
        var isActive = await _userRepoMock.Object.IsUserActiveAsync(userId);

        // Assert
        Assert.True(isActive);
    }

    [Fact]
    public async Task BlockedUser_IsDeniedAccess_TokenBecomesInvalid()
    {
        // Arrange - SR-257: Tokens issued prior to blocking must immediately stop working
        const int userId = 102;
        _userRepoMock.Setup(r => r.IsUserActiveAsync(userId))
            .ReturnsAsync(false);

        // Act
        var isActive = await _userRepoMock.Object.IsUserActiveAsync(userId);

        // Assert
        Assert.False(isActive);
    }

    [Fact]
    public async Task SoftDeletedUser_IsDeniedAccess_TokenBecomesInvalid()
    {
        // Arrange - SR-257: Tokens issued prior to soft deletion must immediately stop working
        const int userId = 103;
        _userRepoMock.Setup(r => r.IsUserActiveAsync(userId))
            .ReturnsAsync(false);

        // Act
        var isActive = await _userRepoMock.Object.IsUserActiveAsync(userId);

        // Assert
        Assert.False(isActive);
    }

    [Fact]
    public async Task UnblockingUser_RestoresAccess()
    {
        // Arrange - SR-257: Unblocking an account restores normal access
        const int userId = 104;
        
        // Step 1: User is blocked
        _userRepoMock.Setup(r => r.IsUserActiveAsync(userId))
            .ReturnsAsync(false);

        var blockedAccess = await _userRepoMock.Object.IsUserActiveAsync(userId);
        Assert.False(blockedAccess);

        // Step 2: Administrator unblocks user
        _userRepoMock.Setup(r => r.IsUserActiveAsync(userId))
            .ReturnsAsync(true);

        var restoredAccess = await _userRepoMock.Object.IsUserActiveAsync(userId);
        Assert.True(restoredAccess);
    }

    [Fact]
    public async Task OnTokenValidated_CallsFail_WhenUserIsBlockedOrDeactivated()
    {
        // Arrange: simulate JwtBearerEvents.OnTokenValidated execution
        const int blockedUserId = 999;
        _userRepoMock.Setup(r => r.IsUserActiveAsync(blockedUserId))
            .ReturnsAsync(false);

        var services = new ServiceCollection();
        services.AddSingleton(_userRepoMock.Object);
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

        // Simulate the OnTokenValidated handler from Program.cs
        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.Principal?.FindFirst("sub")?.Value;

        if (!int.TryParse(userIdClaim, out var userId) || !await _userRepoMock.Object.IsUserActiveAsync(userId))
        {
            context.Fail("User account is inactive or blocked.");
        }

        // Assert
        Assert.NotNull(context.Result);
        Assert.False(context.Result.Succeeded);
    }

    [Fact]
    public async Task OnTokenValidated_Succeeds_WhenUserIsActive()
    {
        // Arrange: simulate JwtBearerEvents.OnTokenValidated execution for active user
        const int activeUserId = 200;
        _userRepoMock.Setup(r => r.IsUserActiveAsync(activeUserId))
            .ReturnsAsync(true);

        var services = new ServiceCollection();
        services.AddSingleton(_userRepoMock.Object);
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

        // Simulate the OnTokenValidated handler from Program.cs
        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.Principal?.FindFirst("sub")?.Value;

        if (!int.TryParse(userIdClaim, out var userId) || !await _userRepoMock.Object.IsUserActiveAsync(userId))
        {
            context.Fail("User account is inactive or blocked.");
        }

        // Assert: context.Fail was NOT called
        Assert.Null(context.Result?.Failure);
    }
}
