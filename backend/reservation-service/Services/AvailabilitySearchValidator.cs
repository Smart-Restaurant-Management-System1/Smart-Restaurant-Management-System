using System.Globalization;
using Microsoft.Extensions.Options;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Services;

public sealed class AvailabilitySearchValidator : IAvailabilitySearchValidator
{
    private readonly TimeProvider _timeProvider;
    private readonly AvailabilityRulesOptions _rules;
    private readonly TimeZoneInfo _restaurantTimeZone;

    public AvailabilitySearchValidator(TimeProvider timeProvider, IOptions<AvailabilityRulesOptions> rules)
    {
        _timeProvider = timeProvider;
        _rules = rules.Value;
        _restaurantTimeZone = TimeZoneInfo.FindSystemTimeZoneById(_rules.TimeZoneId);
    }

    public bool TryValidate(AvailabilitySearchRequestDto? request, out AvailabilitySearchCriteria? criteria, out Dictionary<string, string[]> errors)
    {
        errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        criteria = null;

        if (request?.Date is null) AddError(errors, "date", "Date is required and must use YYYY-MM-DD.");
        if (request?.StartTime is null) AddError(errors, "startTime", "Start time is required and must use HH:mm.");
        if (request?.DurationMinutes is null) AddError(errors, "durationMinutes", "Duration is required.");
        else if (request.DurationMinutes <= 0) AddError(errors, "durationMinutes", "Duration must be greater than zero.");
        if (request?.GuestCount is null) AddError(errors, "guestCount", "Guest count is required.");
        else if (request.GuestCount < 1) AddError(errors, "guestCount", "Guest count must be at least 1.");

        if (errors.Count > 0 || request is null || request.Date is null || request.StartTime is null || request.DurationMinutes is null || request.GuestCount is null)
            return false;

        if (request.DurationMinutes < _rules.MinimumDurationMinutes || request.DurationMinutes > _rules.MaximumDurationMinutes)
            AddError(errors, "durationMinutes", $"Duration must be between {_rules.MinimumDurationMinutes} and {_rules.MaximumDurationMinutes} minutes.");

        var openingTime = ParseConfiguredTime(_rules.OpeningTime, nameof(_rules.OpeningTime));
        var closingTime = ParseConfiguredTime(_rules.ClosingTime, nameof(_rules.ClosingTime));
        var requestedStart = DateTime.SpecifyKind(request.Date.Value.ToDateTime(request.StartTime.Value), DateTimeKind.Unspecified);
        DateTime requestedEnd;
        try { requestedEnd = requestedStart.AddMinutes(request.DurationMinutes.Value); }
        catch (ArgumentOutOfRangeException) { AddError(errors, "durationMinutes", "Duration creates an invalid booking period."); return false; }

        var restaurantNow = TimeZoneInfo.ConvertTime(_timeProvider.GetUtcNow(), _restaurantTimeZone).DateTime;
        if (request.Date.Value < DateOnly.FromDateTime(restaurantNow))
            AddError(errors, "date", "The requested date must not be in the past.");
        else if (requestedStart < restaurantNow)
            AddError(errors, "startTime", "The requested start time must not be in the past.");
        if (requestedEnd <= requestedStart)
            AddError(errors, "durationMinutes", "The booking end must be later than the start time.");
        if (requestedEnd.Date != requestedStart.Date || requestedStart.TimeOfDay < openingTime.ToTimeSpan() || requestedEnd.TimeOfDay > closingTime.ToTimeSpan())
            AddError(errors, "startTime", $"Bookings must be within restaurant hours ({_rules.OpeningTime}–{_rules.ClosingTime}) and cannot cross midnight.");

        if (errors.Count > 0) return false;
        criteria = new AvailabilitySearchCriteria(requestedStart, requestedEnd, request.GuestCount.Value);
        return true;
    }

    private static TimeOnly ParseConfiguredTime(string value, string name) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed
            : throw new InvalidOperationException($"Reservation availability setting '{name}' must use HH:mm.");

    private static void AddError(IDictionary<string, string[]> errors, string field, string message) => errors[field] = [message];
}
