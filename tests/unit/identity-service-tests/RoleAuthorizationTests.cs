using System.Security.Claims;
using IdentityService.Controllers;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using Xunit;

namespace IdentityServiceTests;

public class RoleAuthorizationTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<ILogger<AuthController>> _loggerMock;
    private readonly AuthController _authController;
    private readonly TablesController _tablesController;

    public RoleAuthorizationTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _loggerMock = new Mock<ILogger<AuthController>>();
        _authController = new AuthController(_authServiceMock.Object, _loggerMock.Object);
        _tablesController = new TablesController();
    }

    private void SetUserContext(ControllerBase controller, string userId, string email, string role)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role),
            new("role", role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    [Fact]
    public void EndpointMetadata_AdminEndpoint_HasAuthorizeAttributeWithAdminRole()
    {
        // Assert that GetAdminUsers has [Authorize(Roles = AppRoles.Admin)]
        var method = typeof(AuthController).GetMethod(nameof(AuthController.GetAdminUsers));
        Assert.NotNull(method);

        var authorizeAttr = method.GetCustomAttributes(typeof(AuthorizeAttribute), false)
                                  .Cast<AuthorizeAttribute>()
                                  .FirstOrDefault();
        Assert.NotNull(authorizeAttr);
        Assert.Equal(AppRoles.Admin, authorizeAttr.Roles);
    }

    [Fact]
    public void EndpointMetadata_StaffEndpoint_HasAuthorizeAttributeWithStaffPolicy()
    {
        // Assert that GetStaffSummary has [Authorize(Policy = AppPolicies.RequireStaff)]
        var method = typeof(AuthController).GetMethod(nameof(AuthController.GetStaffSummary));
        Assert.NotNull(method);

        var authorizeAttr = method.GetCustomAttributes(typeof(AuthorizeAttribute), false)
                                  .Cast<AuthorizeAttribute>()
                                  .FirstOrDefault();
        Assert.NotNull(authorizeAttr);
        Assert.Equal(AppPolicies.RequireStaff, authorizeAttr.Policy);
    }

    [Fact]
    public void EndpointMetadata_ReservationCreate_HasAuthorizeAttributeWithAdminRole()
    {
        // Assert that TablesController.CreateTable has [Authorize(Roles = AppRoles.Admin)]
        var method = typeof(TablesController).GetMethod(nameof(TablesController.CreateTable));
        Assert.NotNull(method);

        var authorizeAttr = method.GetCustomAttributes(typeof(AuthorizeAttribute), false)
                                  .Cast<AuthorizeAttribute>()
                                  .FirstOrDefault();
        Assert.NotNull(authorizeAttr);
        Assert.Equal(ReservationService.Models.AppRoles.Admin, authorizeAttr.Roles);
    }

    [Fact]
    public void EndpointMetadata_ReservationAvailability_HasAllowAnonymousAttribute()
    {
        // Assert that CheckAvailability is public
        var method = typeof(TablesController).GetMethod(nameof(TablesController.CheckAvailability));
        Assert.NotNull(method);

        var anonAttr = method.GetCustomAttributes(typeof(AllowAnonymousAttribute), false).FirstOrDefault();
        Assert.NotNull(anonAttr);
    }

    [Fact]
    public void GetProfile_AuthenticatedCustomer_ReturnsOkWithCustomerRole()
    {
        SetUserContext(_authController, "101", "customer@bistro.com", AppRoles.Customer);

        var result = _authController.GetProfile() as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
    }

    [Fact]
    public void GetProfile_AuthenticatedKitchenStaff_ReturnsOkWithKitchenRole()
    {
        SetUserContext(_authController, "202", "chef@bistro.com", AppRoles.KitchenStaff);

        var result = _authController.GetProfile() as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
    }

    [Fact]
    public void GetAdminUsers_AdminRole_ReturnsOk()
    {
        SetUserContext(_authController, "1", "admin@bistro.com", AppRoles.Admin);

        var result = _authController.GetAdminUsers() as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
    }

    [Fact]
    public void TablesController_CreateTable_AdminRole_ReturnsCreated()
    {
        SetUserContext(_tablesController, "1", "admin@bistro.com", ReservationService.Models.AppRoles.Admin);

        var request = new CreateTableRequest("T-10", 4, "Patio");
        var result = _tablesController.CreateTable(request) as ObjectResult;

        Assert.NotNull(result);
        Assert.Equal(StatusCodes.Status201Created, result.StatusCode);
    }

    [Fact]
    public void TablesController_CheckAvailability_ReturnsOkWithoutAuth()
    {
        var result = _tablesController.CheckAvailability() as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
    }
}
