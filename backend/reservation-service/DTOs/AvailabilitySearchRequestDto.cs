namespace ReservationService.DTOs;

/// <summary>Query contract for GET /api/reservations/availability. Date and time are restaurant-local wall-clock values.</summary>
public sealed class AvailabilitySearchRequestDto
{
    public DateOnly? Date { get; init; }
    public TimeOnly? StartTime { get; init; }
    public int? DurationMinutes { get; init; }
    public int? GuestCount { get; init; }
}
