namespace ReservationService.DTOs;

/// <summary>Scheduling input only. Ownership, status and immutable reservation values remain server controlled.</summary>
public sealed class RescheduleReservationRequestDto
{
    public int? TableId { get; init; }
    public DateOnly? Date { get; init; }
    public TimeOnly? StartTime { get; init; }
    public int? DurationMinutes { get; init; }
    public int? GuestCount { get; init; }
}
