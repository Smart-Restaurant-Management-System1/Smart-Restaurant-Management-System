using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

/// <summary>
/// Unit tests for SR-225 / SR-258:
/// Harden Backend RBAC and Ownership Validation in Reservation Service.
/// Verifies:
/// 1. Admin-only controllers/actions (MenuItemsController, ReportsController, Tables write methods) reject Customer and KitchenStaff.
/// 2. Kitchen queue endpoints reject Customer.
/// 3. Ordering / Cart endpoints require Customer role.
/// 4. Strict customer ownership: Customer A cannot read, cancel, or reschedule Customer B's reservations (404 nondisclosure policy).
/// </summary>
public class RbacAndOwnershipReservationTests
{
    private static ClaimsPrincipal CreatePrincipal(string? role, int userId = 1)
    {
        if (role == null)
        {
            return new ClaimsPrincipal(new ClaimsIdentity());
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

    private static async Task<bool> IsAllowedAsync(Type controllerType, string? actionName, string? role)
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
    [InlineData("UnknownAttacker")]
    public async Task MenuItemsController_NonAdminRoles_AreForbidden(string unauthorizedRole)
    {
        var allowed = await IsAllowedAsync(typeof(MenuItemsController), null, unauthorizedRole);
        Assert.False(allowed);
    }

    [Fact]
    public async Task MenuItemsController_AdminRole_IsAllowed()
    {
        var allowed = await IsAllowedAsync(typeof(MenuItemsController), null, AppRoles.Admin);
        Assert.True(allowed);
    }

    [Theory]
    [InlineData(AppRoles.Customer)]
    [InlineData(AppRoles.KitchenStaff)]
    public async Task ReportsController_NonAdminRoles_AreForbidden(string unauthorizedRole)
    {
        var allowed = await IsAllowedAsync(typeof(ReportsController), null, unauthorizedRole);
        Assert.False(allowed);
    }

    [Fact]
    public async Task ReportsController_AdminRole_IsAllowed()
    {
        var allowed = await IsAllowedAsync(typeof(ReportsController), null, AppRoles.Admin);
        Assert.True(allowed);
    }

    [Theory]
    [InlineData(nameof(TablesController.CreateTable))]
    [InlineData(nameof(TablesController.UpdateTable))]
    [InlineData(nameof(TablesController.DeleteTable))]
    public async Task TablesController_Mutations_CustomerAndStaff_AreForbidden(string actionName)
    {
        var customerAllowed = await IsAllowedAsync(typeof(TablesController), actionName, AppRoles.Customer);
        var kitchenAllowed = await IsAllowedAsync(typeof(TablesController), actionName, AppRoles.KitchenStaff);
        Assert.False(customerAllowed);
        Assert.False(kitchenAllowed);
    }

    [Theory]
    [InlineData(nameof(TablesController.CreateTable))]
    [InlineData(nameof(TablesController.UpdateTable))]
    [InlineData(nameof(TablesController.DeleteTable))]
    public async Task TablesController_Mutations_Admin_IsAllowed(string actionName)
    {
        var adminAllowed = await IsAllowedAsync(typeof(TablesController), actionName, AppRoles.Admin);
        Assert.True(adminAllowed);
    }

    [Fact]
    public async Task KitchenQueueController_Customer_IsForbidden()
    {
        var allowed = await IsAllowedAsync(typeof(KitchenQueueController), null, AppRoles.Customer);
        Assert.False(allowed);
    }

    [Theory]
    [InlineData(AppRoles.KitchenStaff)]
    [InlineData(AppRoles.Admin)]
    public async Task KitchenQueueController_KitchenStaffAndAdmin_AreAllowed(string staffRole)
    {
        var allowed = await IsAllowedAsync(typeof(KitchenQueueController), null, staffRole);
        Assert.True(allowed);
    }

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.KitchenStaff)]
    public async Task OrderCartController_StaffRoles_AreForbidden(string staffRole)
    {
        var allowed = await IsAllowedAsync(typeof(OrderCartController), null, staffRole);
        Assert.False(allowed);
    }

    [Fact]
    public async Task OrderCartController_Customer_IsAllowed()
    {
        var allowed = await IsAllowedAsync(typeof(OrderCartController), null, AppRoles.Customer);
        Assert.True(allowed);
    }

    [Fact]
    public async Task CustomerCannotReadAnotherCustomersReservation_ReturnsNotFound()
    {
        // Setup: Customer 10 requests reservation 500, but reservation 500 belongs to Customer 20.
        // ReservationRepository returns null for (reservationId: 500, customerId: 10) due to ownership predicate.
        var reservationRepoMock = new Mock<IReservationRepository>();
        reservationRepoMock
            .Setup(s => s.GetByIdForCustomerAsync(500, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Reservation?)null);

        var controller = new ReservationsController(
            Mock.Of<IAvailabilitySearchValidator>(),
            Mock.Of<IAvailabilitySearchService>(),
            Mock.Of<IReservationCreationService>(),
            Mock.Of<ILogger<ReservationsController>>(),
            reservationRepository: reservationRepoMock.Object
        );

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal(AppRoles.Customer, userId: 10)
            }
        };

        var result = await controller.GetMyReservation(500, CancellationToken.None);

        // Nondisclosure policy: returns 404 NotFound
        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task CustomerCannotCancelAnotherCustomersReservation_ReturnsNotFound()
    {
        // Setup: Customer 10 tries to cancel reservation 500 owned by Customer 20.
        // LifecycleService returns NotFound because customerId mismatch prevents locating the row for that customer.
        var lifecycleServiceMock = new Mock<IReservationLifecycleService>();
        lifecycleServiceMock
            .Setup(s => s.CancelForCustomerAsync(500, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationCancellationResult(ReservationCancellationOutcome.NotFound));

        var controller = new ReservationsController(
            Mock.Of<IAvailabilitySearchValidator>(),
            Mock.Of<IAvailabilitySearchService>(),
            Mock.Of<IReservationCreationService>(),
            Mock.Of<ILogger<ReservationsController>>(),
            lifecycleService: lifecycleServiceMock.Object
        );

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal(AppRoles.Customer, userId: 10)
            }
        };

        var result = await controller.CancelMyReservation(500, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task CustomerCannotRescheduleAnotherCustomersReservation_ReturnsNotFound()
    {
        var rescheduleServiceMock = new Mock<IReservationRescheduleService>();
        rescheduleServiceMock
            .Setup(s => s.RescheduleAsync(It.Is<ReservationRescheduleCommand>(c => c.ReservationId == 500 && c.ActorUserId == 10 && !c.IsAdmin), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.NotFound));

        var validatorMock = new Mock<IAvailabilitySearchValidator>();
        var dummyErrors = new Dictionary<string, string[]>();
        validatorMock
            .Setup(v => v.TryValidate(It.IsAny<AvailabilitySearchRequestDto>(), out It.Ref<AvailabilitySearchCriteria?>.IsAny, out dummyErrors))
            .Returns(true);

        var controller = new ReservationsController(
            validatorMock.Object,
            Mock.Of<IAvailabilitySearchService>(),
            Mock.Of<IReservationCreationService>(),
            Mock.Of<ILogger<ReservationsController>>(),
            rescheduleService: rescheduleServiceMock.Object
        );

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal(AppRoles.Customer, userId: 10)
            }
        };

        var request = new RescheduleReservationRequestDto
        {
            TableId = 3,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            StartTime = new TimeOnly(18, 0),
            DurationMinutes = 90,
            GuestCount = 2
        };

        var result = await controller.RescheduleReservation(500, request, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }
}
