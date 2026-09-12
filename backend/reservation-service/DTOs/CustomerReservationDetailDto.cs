namespace ReservationService.DTOs;

/// <summary>Customer-owned detail; never exposes another customer's identity.</summary>
public sealed class CustomerReservationDetailDto
{
    public int ReservationId { get; init; }
    public bool CanEdit { get; init; }
    public bool CanCancel { get; init; }
    public string BookingReference { get; init; } = string.Empty;
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public DateTime StartDateTime { get; init; }
    public DateTime EndDateTime { get; init; }
    public int GuestCount { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
