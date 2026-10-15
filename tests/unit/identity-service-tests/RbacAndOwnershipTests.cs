using System.Reflection;
using System.Security.Claims;
using IdentityService.Controllers;
using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-258:
/// Harden Backend RBAC and Ownership Validation in Identity Service.
/// Verifies that:
/// 1. Admin endpoints reject Customer and KitchenStaff with 403 Forbidden.
/// 2. Staff endpoints reject Customer with 403 Forbidden.
/// 3. User profile endpoints enforce server-side ownership strictly via JWT claims.
/// </summary>
public class RbacAndOwnershipTests
{
    private static ClaimsPrincipal CreatePrincipal(string? role, int userId = 1)
    {
        if (role == null)
        {
            return new ClaimsPrincipal(new ClaimsIdentity()); // Unauthenticated
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new(ClaimTypes.Role, role),
            new("role", role)
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private static async Task<bool> IsPolicyAllowedAsync(Type controllerType, string? actionName, string? role)
    {
        var memberAttributes = actionName != null
            ? controllerType.GetMethod(actionName)?.GetCustomAttributes<AuthorizeAttribute>(true).ToList() ?? new List<AuthorizeAttribute>()
            : new List<AuthorizeAttribute>();

        var classAttributes = controllerType.GetCustomAttributes<AuthorizeAttribute>(true).ToList();
        var allAuthorizeData = classAttributes.Concat(memberAttributes).ToList();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
        {
            options.AddPolicy(AppPolicies.RequireAdmin, p => p.RequireRole(AppRoles.Admin));
            options.AddPolicy(AppPolicies.RequireCustomer, p => p.RequireRole(AppRoles.Customer));
            options.AddPolicy(AppPolicies.RequireKitchenStaff, p => p.RequireRole(AppRoles.KitchenStaff));
            options.AddPolicy(AppPolicies.RequireStaff, p => p.RequireRole(AppRoles.Admin, AppRoles.KitchenStaff));
        });

        using var provider = services.BuildServiceProvider();
        var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();
        var policy = await AuthorizationPolicy.CombineAsync(policyProvider, allAuthorizeData);

        if (policy == null)
        {
            return true;
        }

        var authService = provider.GetRequiredService<IAuthorizationService>();
        var result = await authService.AuthorizeAsync(CreatePrincipal(role), null, policy);
        return result.Succeeded;
    }

    [Theory]
    [InlineData(AppRoles.Customer)]
    [InlineData(AppRoles.KitchenStaff)]
    [InlineData("RandomAttackerRole")]
    public async Task AdminUsersController_NonAdminRoles_AreForbidden(string unauthorizedRole)
    {
        // AdminUsersController is protected at class level with [Authorize(Roles = AppRoles.Admin)]
        var allowed = await IsPolicyAllowedAsync(typeof(AdminUsersController), null, unauthorizedRole);
        Assert.False(allowed);
    }

    [Fact]
    public async Task AdminUsersController_AdminRole_IsAllowed()
    {
        var allowed = await IsPolicyAllowedAsync(typeof(AdminUsersController), null, AppRoles.Admin);
        Assert.True(allowed);
    }

    [Fact]
    public async Task StaffSummaryEndpoint_Customer_IsForbidden()
    {
        // Staff endpoint has [Authorize(Policy = AppPolicies.RequireStaff)]
        var allowed = await IsPolicyAllowedAsync(typeof(AuthController), nameof(AuthController.GetStaffSummary), AppRoles.Customer);
        Assert.False(allowed);
    }

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.KitchenStaff)]
    public async Task StaffSummaryEndpoint_StaffRoles_AreAllowed(string staffRole)
    {
        var allowed = await IsPolicyAllowedAsync(typeof(AuthController), nameof(AuthController.GetStaffSummary), staffRole);
        Assert.True(allowed);
    }

    [Fact]
    public async Task UserProfile_DerivesIdentityStrictlyFromToken_NeverFromClientInput()
    {
        // Arrange
        const int authenticatedUserId = 88;
        var userServiceMock = new Mock<IUserService>();
        var loggerMock = new Mock<ILogger<UsersController>>();

        userServiceMock.Setup(s => s.GetProfileAsync(authenticatedUserId))
            .ReturnsAsync(new UserResponseDto
            {
                UserId = authenticatedUserId,
                FullName = "Authenticated User",
                Email = "auth@bistro.com",
                Roles = new List<string> { AppRoles.Customer }
            });

        var controller = new UsersController(userServiceMock.Object, loggerMock.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal(AppRoles.Customer, authenticatedUserId)
            }
        };

        // Act
        var result = await controller.GetProfile() as OkObjectResult;

        // Assert: profile returned is strictly for the authenticated token user ID
        Assert.NotNull(result);
        var profile = result.Value as UserResponseDto;
        Assert.NotNull(profile);
        Assert.Equal(authenticatedUserId, profile.UserId);
        userServiceMock.Verify(s => s.GetProfileAsync(authenticatedUserId), Times.Once);
        // Verify no other user ID was queried
        userServiceMock.Verify(s => s.GetProfileAsync(It.Is<int>(id => id != authenticatedUserId)), Times.Never);
    }
}

