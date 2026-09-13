namespace ReservationService.DTOs;

/// <summary>Query contract for GET /api/reservations/availability. Date and time are restaurant-local wall-clock values.</summary>
public sealed class AvailabilitySearchRequestDto
{
    /// <summary>Requested reservation date (restaurant-local), format YYYY-MM-DD. Required.</summary>
    public DateOnly? Date { get; init; }

    /// <summary>Requested start time (restaurant-local), format HH:mm. Required.</summary>
    public TimeOnly? StartTime { get; init; }

    /// <summary>Requested booking length in minutes. Required; must be within the configured min/max duration.</summary>
    public int? DurationMinutes { get; init; }

    /// <summary>Number of guests the table must seat. Required; must be at least 1.</summary>
    public int? GuestCount { get; init; }
}
