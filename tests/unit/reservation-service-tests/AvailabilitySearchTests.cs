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

public sealed class AvailabilitySearchTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 9, 11, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Validator_AcceptsFutureRequestAndCalculatesEnd()
    {
        var validator = CreateValidator();
        var valid = validator.TryValidate(new AvailabilitySearchRequestDto
        {
            Date = new DateOnly(2026, 9, 12), StartTime = new TimeOnly(19, 0), DurationMinutes = 90, GuestCount = 4
        }, out var criteria, out var errors);

        Assert.True(valid);
        Assert.Empty(errors);
        Assert.Equal(new DateTime(2026, 9, 12, 19, 0, 0), criteria!.RequestedStart);
        Assert.Equal(new DateTime(2026, 9, 12, 20, 30, 0), criteria.RequestedEnd);
    }

    [Theory]
    [InlineData(0, 4, "durationMinutes")]
    [InlineData(-30, 4, "durationMinutes")]
    [InlineData(90, 0, "guestCount")]
    [InlineData(90, -1, "guestCount")]
    public void Validator_RejectsNonPositiveDurationAndGuests(int duration, int guests, string field)
    {
        var valid = CreateValidator().TryValidate(new AvailabilitySearchRequestDto
        {
            Date = new DateOnly(2026, 9, 12), StartTime = new TimeOnly(19, 0), DurationMinutes = duration, GuestCount = guests
        }, out _, out var errors);

        Assert.False(valid);
        Assert.Contains(field, errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validator_RejectsPastStartAndOperatingHoursViolation()
    {
        var validator = CreateValidator();
        Assert.False(validator.TryValidate(new AvailabilitySearchRequestDto { Date = new DateOnly(2026, 9, 11), StartTime = new TimeOnly(11, 0), DurationMinutes = 90, GuestCount = 2 }, out _, out var past));
        Assert.Contains("startTime", past.Keys, StringComparer.OrdinalIgnoreCase);

        Assert.False(validator.TryValidate(new AvailabilitySearchRequestDto { Date = new DateOnly(2026, 9, 12), StartTime = new TimeOnly(21, 0), DurationMinutes = 90, GuestCount = 2 }, out _, out var hours));
        Assert.Contains("startTime", hours.Keys, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validator_RejectsPastDate()
    {
        var valid = CreateValidator().TryValidate(new AvailabilitySearchRequestDto { Date = new DateOnly(2026, 9, 10), StartTime = new TimeOnly(19, 0), DurationMinutes = 90, GuestCount = 2 }, out _, out var errors);
        Assert.False(valid);
        Assert.Contains("date", errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Controller_InvalidRequest_Returns400WithoutCallingService()
    {
        var service = new Mock<IAvailabilitySearchService>();
        var controller = new ReservationsController(CreateValidator(), service.Object, Mock.Of<ILogger<ReservationsController>>());
        var result = await controller.GetAvailability(new AvailabilitySearchRequestDto { GuestCount = 0 });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var details = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Contains("date", details.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        service.Verify(x => x.SearchAsync(It.IsAny<AvailabilitySearchCriteria>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Controller_ValidRequest_ReturnsStableDtoAndCallsServiceOnce()
    {
        var service = new Mock<IAvailabilitySearchService>();
        service.Setup(x => x.SearchAsync(It.IsAny<AvailabilitySearchCriteria>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AvailableTable { TableId = 12, TableNumber = "T-12", SeatingCapacity = 4 }]);
        var controller = new ReservationsController(CreateValidator(), service.Object, Mock.Of<ILogger<ReservationsController>>());

        var result = await controller.GetAvailability(new AvailabilitySearchRequestDto { Date = new DateOnly(2026, 9, 12), StartTime = new TimeOnly(19, 0), DurationMinutes = 90, GuestCount = 4 });

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsAssignableFrom<IEnumerable<AvailableTableResponseDto>>(ok.Value).Single();
        Assert.Equal(12, response.TableId); Assert.Equal("T-12", response.TableNumber); Assert.Equal(4, response.SeatingCapacity);
        service.Verify(x => x.SearchAsync(It.IsAny<AvailabilitySearchCriteria>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static AvailabilitySearchValidator CreateValidator() => new(new FixedTimeProvider(FixedNow), Options.Create(new AvailabilityRulesOptions()));

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
