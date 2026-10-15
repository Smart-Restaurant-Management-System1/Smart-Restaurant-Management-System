using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationConcurrencyTests
{
    private static readonly DateTime ExistingStart = new(2026, 9, 20, 19, 0, 0);
    private static readonly DateTime ExistingEnd = new(2026, 9, 20, 20, 30, 0);

    [Theory]
    [InlineData(19, 0, 20, 30, true)]   // identical
    [InlineData(19, 15, 20, 0, true)]   // requested inside
    [InlineData(18, 30, 21, 0, true)]   // existing inside
    [InlineData(18, 45, 19, 15, true)]  // start overlap
    [InlineData(20, 15, 20, 45, true)]  // end overlap
    [InlineData(20, 30, 21, 0, false)]  // requested starts at existing end
    [InlineData(18, 0, 19, 0, false)]   // requested ends at existing start
    public void CanonicalOverlapRule_HandlesAllIntervalShapes(int startHour, int startMinute, int endHour, int endMinute, bool expected)
    {
        Assert.Equal(expected, ReservationOverlapPolicy.Blocks(ExistingStart, ExistingEnd, new DateTime(2026, 9, 20, startHour, startMinute, 0), new DateTime(2026, 9, 20, endHour, endMinute, 0), ReservationStatus.Pending));
    }

    [Fact]
    public void CanonicalOverlapRule_OnlyPendingAndConfirmedBlock()
    {
        Assert.True(ReservationOverlapPolicy.Blocks(ExistingStart, ExistingEnd, ExistingStart, ExistingEnd, ReservationStatus.Confirmed));
        Assert.False(ReservationOverlapPolicy.Blocks(ExistingStart, ExistingEnd, ExistingStart, ExistingEnd, ReservationStatus.Cancelled));
    }

    [Fact]
    public async Task RescheduleConflict_UsesSameStable409Contract()
    {
        var rescheduler = new Mock<IReservationRescheduleService>();
        rescheduler.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.Unavailable));
        var controller = Controller(rescheduler.Object, AppRoles.Customer, "159");
        var result = await controller.RescheduleReservation(42, ValidRequest());
        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal("TABLE_NO_LONGER_AVAILABLE", conflict.Value!.GetType().GetProperty("code")!.GetValue(conflict.Value));
    }

    [Fact]
    public async Task RescheduleForbidden_DoesNotReturnAvailabilityConflict()
    {
        var rescheduler = new Mock<IReservationRescheduleService>();
        rescheduler.Setup(x => x.RescheduleAsync(It.IsAny<ReservationRescheduleCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(new ReservationRescheduleResult(ReservationRescheduleOutcome.Forbidden));
        var result = await Controller(rescheduler.Object, AppRoles.Customer, "159").RescheduleReservation(42, ValidRequest());
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public void Repository_UsesDestinationLockSharedStrictQueryAndSelfExclusion()
    {
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".."));
        var source = File.ReadAllText(Path.Combine(root, "backend", "reservation-service", "Repositories", "ReservationRepository.cs"));
        Assert.Contains("LockTableAsync(connection, transaction, command.TableId", source);
        Assert.Contains("Id <> @ExcludedReservationId", source);
        Assert.Contains("StartDateTime < @RequestedEnd AND EndDateTime > @RequestedStart", source);
        Assert.Contains("UpdateScheduleAsync(connection, transaction", source);
    }

    private static RescheduleReservationRequestDto ValidRequest() => new() { TableId = 2, Date = new DateOnly(2026, 9, 20), StartTime = new TimeOnly(19, 0), DurationMinutes = 90, GuestCount = 2 };
    private static ReservationsController Controller(IReservationRescheduleService rescheduler, string role, string userId)
    {
        var validator = new AvailabilitySearchValidator(new FixedTimeProvider(new DateTimeOffset(2026, 9, 11, 12, 0, 0, TimeSpan.Zero)), Options.Create(new AvailabilityRulesOptions()));
        var controller = new ReservationsController(validator, Mock.Of<IAvailabilitySearchService>(), Mock.Of<IReservationCreationService>(), Mock.Of<ILogger<ReservationsController>>(), rescheduleService: rescheduler);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, role)], "test")) } };
        return controller;
    }
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider { public override DateTimeOffset GetUtcNow() => now; }
}
