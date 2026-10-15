namespace ReservationService.DTOs;

/// <summary>Untrusted customer booking input. Ownership, status and booking reference are server controlled.</summary>
public sealed class CreateReservationRequestDto
{
    public int? TableId { get; init; }
    public DateOnly? Date { get; init; }
    public TimeOnly? StartTime { get; init; }
    public int? DurationMinutes { get; init; }
    public int? GuestCount { get; init; }
}
