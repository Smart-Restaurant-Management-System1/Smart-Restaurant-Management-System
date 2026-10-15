namespace ReservationService.DTOs;

public sealed class ReservationConfirmationResponseDto
{
    public int ReservationId { get; init; }
    public string BookingReference { get; init; } = string.Empty;
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public DateTime StartDateTime { get; init; }
    public DateTime EndDateTime { get; init; }
    public int GuestCount { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}
