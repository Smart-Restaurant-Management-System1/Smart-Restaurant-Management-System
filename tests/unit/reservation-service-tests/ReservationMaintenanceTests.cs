using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationMaintenanceTests
{
    private sealed class Clock : TimeProvider { public override DateTimeOffset GetUtcNow() => new(2030, 1, 1, 10, 0, 0, TimeSpan.Zero); }
    private static ReservationMaintenancePolicy Policy() => new(new Clock(), Options.Create(new AvailabilityRulesOptions()));
    private static Reservation Booking(string status = "Pending", int hour = 16) => new()
    {
        Id = 42, CustomerId = 7, TableId = 2, TableNumber = "T2", BookingReference = "SR-TEST",
        StartDateTime = new(2030, 1, 1, hour, 0, 0), EndDateTime = new(2030, 1, 1, hour + 1, 0, 0),
        GuestCount = 2, Status = status
    };

    [Theory]
    [InlineData("Pending", 16, true)]
    [InlineData("Confirmed", 16, true)]
    [InlineData("Cancelled", 16, false)]
    [InlineData("Completed", 16, false)]
    [InlineData("Pending", 15, false)]
    [InlineData("Confirmed", 15, false)]
    public void EligibilityUsesRestaurantTimeNotBrowserOrUtcWallClock(string status, int hour, bool allowed) =>
        Assert.Equal(allowed, Policy().CanCustomerMaintain(Booking(status, hour)));

    [Fact]
    public void NoCutoffButExactStartIsNotUpcoming()
    {
        var now = Policy().RestaurantNow;
        Assert.False(Policy().CanCustomerMaintain(Booking() with { StartDateTime = now }));
        Assert.True(Policy().CanCustomerMaintain(Booking() with { StartDateTime = now.AddSeconds(1) }));
    }

    [Theory]
    [InlineData("Pending", true)]
    [InlineData("Confirmed", true)]
    [InlineData("Cancelled", false)]
    [InlineData("Completed", false)]
    public void AdminCompatibilityPreservesNonterminalPolicy(string status, bool allowed) =>
        Assert.Equal(allowed, Policy().CanReschedule(Booking(status, 12), true));

    private static ReservationsController Controller(IReservationRepository repository, IReservationLifecycleService? lifecycle = null, string userId = "7")
    {
        var controller = new ReservationsController(Mock.Of<IAvailabilitySearchValidator>(), Mock.Of<IAvailabilitySearchService>(),
            Mock.Of<IReservationCreationService>(), Mock.Of<ILogger<ReservationsController>>(),
            lifecycleService: lifecycle, reservationRepository: repository, maintenancePolicy: Policy());
        controller.ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, AppRoles.Customer)], "test")) } };
        return controller;
    }

    [Fact]
    public async Task DetailUsesJwtOwnerAndReturnsSafeFields()
    {
        var repo = new Mock<IReservationRepository>(MockBehavior.Strict);
        repo.Setup(x => x.GetByIdForCustomerAsync(42, 7, It.IsAny<CancellationToken>())).ReturnsAsync(Booking());
        var result = Assert.IsType<OkObjectResult>(await Controller(repo.Object).GetMyReservation(42));
        var dto = Assert.IsType<CustomerReservationDetailDto>(result.Value);
        Assert.Equal("SR-TEST", dto.BookingReference); Assert.True(dto.CanEdit); Assert.True(dto.CanCancel);
        Assert.Null(typeof(CustomerReservationDetailDto).GetProperty("CustomerId"));
        Assert.Null(typeof(RescheduleReservationRequestDto).GetProperty("CustomerId"));
        Assert.Null(typeof(RescheduleReservationRequestDto).GetProperty("Status"));
    }

    [Fact]
    public async Task WrongOwnerAndMissingRecordUseSame404()
    {
        var repo = new Mock<IReservationRepository>();
        repo.Setup(x => x.GetByIdForCustomerAsync(42, 8, It.IsAny<CancellationToken>())).ReturnsAsync((Reservation?)null);
        Assert.IsType<NotFoundObjectResult>(await Controller(repo.Object, userId: "8").GetMyReservation(42));
        Assert.IsType<NotFoundObjectResult>(await Controller(repo.Object, userId: "8").GetMyReservation(999));
    }

    [Fact]
    public async Task MissingClaimAndInvalidIdDoNotReadRepository()
    {
        var repo = new Mock<IReservationRepository>(MockBehavior.Strict);
        Assert.IsType<UnauthorizedResult>(await Controller(repo.Object, userId: "invalid").GetMyReservation(42));
        Assert.IsType<BadRequestObjectResult>(await Controller(repo.Object).GetMyReservation(0));
    }

    [Fact]
    public async Task DetailDatabaseFailureReturnsSafe500()
    {
        var repo = new Mock<IReservationRepository>();
        repo.Setup(x => x.GetByIdForCustomerAsync(42, 7, It.IsAny<CancellationToken>())).ThrowsAsync(new Exception("private database diagnostic"));
        var result = Assert.IsType<ObjectResult>(await Controller(repo.Object).GetMyReservation(42));
        Assert.Equal(500, result.StatusCode);
        Assert.DoesNotContain("private", System.Text.Json.JsonSerializer.Serialize(result.Value));
    }

    [Theory]
    [InlineData(ReservationCancellationOutcome.Cancelled, 200)]
    [InlineData(ReservationCancellationOutcome.NotFound, 404)]
    [InlineData(ReservationCancellationOutcome.InvalidState, 409)]
    public async Task CancellationUsesAtomicResultWithoutPostCommitLookup(ReservationCancellationOutcome outcome, int status)
    {
        var repository = new Mock<IReservationRepository>(MockBehavior.Strict);
        var lifecycle = new Mock<IReservationLifecycleService>();
        lifecycle.Setup(x => x.CancelForCustomerAsync(42, 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationCancellationResult(outcome, Booking("Cancelled")));
        var result = Assert.IsAssignableFrom<ObjectResult>(await Controller(repository.Object, lifecycle.Object).CancelMyReservation(42));
        Assert.Equal(status, result.StatusCode);
        if (status == 200) Assert.False(Assert.IsType<CustomerReservationDetailDto>(result.Value).CanCancel);
    }

    [Fact]
    public async Task CancellationLifecycleDelegatesToAtomicRepository()
    {
        var repo = new Mock<IReservationRepository>();
        var expected = new ReservationCancellationResult(ReservationCancellationOutcome.Cancelled, Booking("Cancelled"));
        repo.Setup(x => x.CancelForCustomerAtomicallyAsync(42, 7, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        Assert.Same(expected, await new ReservationLifecycleService(repo.Object).CancelForCustomerAsync(42, 7));
    }

    // --- Update (PUT) input validation ---
    // These tests use a mock validator so they exercise only controller routing logic.
    // The validator's own rejection rules are covered in AvailabilitySearchTests.

    [Fact]
    public async Task UpdateRejectsInvalidDateOrTimePeriodWith400()
    {
        // Arrange: validator reports a date/startTime validation error
        var validator = new Mock<IAvailabilitySearchValidator>();
        validator.Setup(v => v.TryValidate(It.IsAny<AvailabilitySearchRequestDto>(), out It.Ref<AvailabilitySearchCriteria?>.IsAny,
            out It.Ref<Dictionary<string, string[]>>.IsAny))
            .Returns((AvailabilitySearchRequestDto _, out AvailabilitySearchCriteria? c, out Dictionary<string, string[]> e) =>
            { c = null; e = new Dictionary<string, string[]> { ["date"] = ["Date is in the past."] }; return false; });
        var controller = ControllerWithValidator(validator.Object);
        var result = await controller.RescheduleReservation(42, new RescheduleReservationRequestDto
            { TableId = 1, Date = new DateOnly(2029, 12, 31), StartTime = new TimeOnly(18, 0), DurationMinutes = 60, GuestCount = 2 });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateRejectsZeroGuestCountWith400()
    {
        var validator = new Mock<IAvailabilitySearchValidator>();
        validator.Setup(v => v.TryValidate(It.IsAny<AvailabilitySearchRequestDto>(), out It.Ref<AvailabilitySearchCriteria?>.IsAny,
            out It.Ref<Dictionary<string, string[]>>.IsAny))
            .Returns((AvailabilitySearchRequestDto _, out AvailabilitySearchCriteria? c, out Dictionary<string, string[]> e) =>
            { c = null; e = new Dictionary<string, string[]> { ["guestCount"] = ["Guest count must be at least 1."] }; return false; });
        var controller = ControllerWithValidator(validator.Object);
        var result = await controller.RescheduleReservation(42, new RescheduleReservationRequestDto
            { TableId = 1, Date = new DateOnly(2030, 6, 1), StartTime = new TimeOnly(18, 0), DurationMinutes = 60, GuestCount = 0 });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateRejectsZeroDurationWith400()
    {
        var validator = new Mock<IAvailabilitySearchValidator>();
        validator.Setup(v => v.TryValidate(It.IsAny<AvailabilitySearchRequestDto>(), out It.Ref<AvailabilitySearchCriteria?>.IsAny,
            out It.Ref<Dictionary<string, string[]>>.IsAny))
            .Returns((AvailabilitySearchRequestDto _, out AvailabilitySearchCriteria? c, out Dictionary<string, string[]> e) =>
            { c = null; e = new Dictionary<string, string[]> { ["durationMinutes"] = ["Duration must be greater than zero."] }; return false; });
        var controller = ControllerWithValidator(validator.Object);
        var result = await controller.RescheduleReservation(42, new RescheduleReservationRequestDto
            { TableId = 1, Date = new DateOnly(2030, 6, 1), StartTime = new TimeOnly(18, 0), DurationMinutes = 0, GuestCount = 2 });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateRejectsMissingTableIdWith400()
    {
        // TableId = null is caught before the validator is called.
        var repo = new Mock<IReservationRepository>(MockBehavior.Strict);
        var result = await Controller(repo.Object).RescheduleReservation(42, new RescheduleReservationRequestDto
            { TableId = null, Date = new DateOnly(2030, 6, 1), StartTime = new TimeOnly(18, 0), DurationMinutes = 60, GuestCount = 2 });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateReturns404WhenRepositoryReturnsNotFound()
    {
        var rescheduleService = new Mock<IReservationRescheduleService>();
        rescheduleService.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.NotFound));
        var controller = ControllerWithReschedule(rescheduleService.Object);
        var result = await controller.RescheduleReservation(42, ValidUpdateRequest());
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task UpdateReturns409WhenOverlapDetected()
    {
        var rescheduleService = new Mock<IReservationRescheduleService>();
        rescheduleService.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.Unavailable));
        var controller = ControllerWithReschedule(rescheduleService.Object);
        var result = Assert.IsType<ConflictObjectResult>(await controller.RescheduleReservation(42, ValidUpdateRequest()));
        Assert.Equal("TABLE_NO_LONGER_AVAILABLE", result.Value!.GetType().GetProperty("code")!.GetValue(result.Value));
    }

    [Fact]
    public async Task UpdateReturns409ForCancelledOrCompletedStatus()
    {
        var rescheduleService = new Mock<IReservationRescheduleService>();
        rescheduleService.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.InvalidState));
        var controller = ControllerWithReschedule(rescheduleService.Object);
        var result = Assert.IsType<ConflictObjectResult>(await controller.RescheduleReservation(42, ValidUpdateRequest()));
        Assert.Equal("INVALID_RESERVATION_STATE", result.Value!.GetType().GetProperty("code")!.GetValue(result.Value));
    }

    [Fact]
    public async Task UpdateReturns200OkWithCurrentServerStateOnSuccess()
    {
        var booking = Booking() with { GuestCount = 3 };
        var rescheduleService = new Mock<IReservationRescheduleService>();
        rescheduleService.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.Updated, booking));
        var result = Assert.IsType<OkObjectResult>(await ControllerWithReschedule(rescheduleService.Object).RescheduleReservation(42, ValidUpdateRequest()));
        var dto = Assert.IsType<ReservationConfirmationResponseDto>(result.Value);
        Assert.Equal(3, dto.GuestCount);
        Assert.Equal("SR-TEST", dto.BookingReference);
    }

    // --- Repository source-code guarantees ---

    [Fact]
    public void RepositoryNeverIssuesPhysicalDeleteOnReservations()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "backend"))) root = root.Parent;
        Assert.NotNull(root);
        var source = File.ReadAllText(Path.Combine(root!.FullName, "backend", "reservation-service", "Repositories", "ReservationRepository.cs"));
        // The repository must never DELETE from the Reservations table.
        Assert.DoesNotContain("DELETE FROM Reservations", source, StringComparison.OrdinalIgnoreCase);
        // Cancellation uses a parameterized UPDATE that filters by owner.
        Assert.Contains("UPDATE Reservations SET Status=@Status", source);
        Assert.Contains("AND CustomerId=@CustomerId", source);
    }

    [Fact]
    public void RepositoryOwnershipFilterAppliedInCustomerDetailQuery()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "backend"))) root = root.Parent;
        Assert.NotNull(root);
        var source = File.ReadAllText(Path.Combine(root!.FullName, "backend", "reservation-service", "Repositories", "ReservationRepository.cs"));
        Assert.Contains("WHERE r.Id = @Id AND r.CustomerId = @CustomerId", source);
    }

    // --- Helpers ---

    private static RescheduleReservationRequestDto ValidUpdateRequest() => new()
    {
        TableId = 2, Date = new DateOnly(2030, 6, 1), StartTime = new TimeOnly(18, 0), DurationMinutes = 60, GuestCount = 2
    };

    // Validator always returns success so downstream service calls are reached.
    private static IAvailabilitySearchValidator PassValidator()
    {
        var mock = new Mock<IAvailabilitySearchValidator>();
        mock.Setup(v => v.TryValidate(It.IsAny<AvailabilitySearchRequestDto>(), out It.Ref<AvailabilitySearchCriteria?>.IsAny,
            out It.Ref<Dictionary<string, string[]>>.IsAny))
            .Returns((AvailabilitySearchRequestDto _, out AvailabilitySearchCriteria? c, out Dictionary<string, string[]> e) =>
            {
                c = new AvailabilitySearchCriteria(new DateTime(2030, 6, 1, 18, 0, 0), new DateTime(2030, 6, 1, 19, 0, 0), 2);
                e = [];
                return true;
            });
        return mock.Object;
    }

    private static ReservationsController ControllerWithReschedule(IReservationRescheduleService rescheduleService, string userId = "7")
    {
        var controller = new ReservationsController(
            PassValidator(), Mock.Of<IAvailabilitySearchService>(), Mock.Of<IReservationCreationService>(),
            Mock.Of<ILogger<ReservationsController>>(),
            rescheduleService: rescheduleService, maintenancePolicy: Policy());
        controller.ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, AppRoles.Customer)], "test")) } };
        return controller;
    }

    private static ReservationsController ControllerWithValidator(IAvailabilitySearchValidator validator, string userId = "7")
    {
        var controller = new ReservationsController(
            validator, Mock.Of<IAvailabilitySearchService>(), Mock.Of<IReservationCreationService>(),
            Mock.Of<ILogger<ReservationsController>>(), maintenancePolicy: Policy());
        controller.ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, AppRoles.Customer)], "test")) } };
        return controller;
    }
}
