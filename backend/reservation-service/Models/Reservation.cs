namespace ReservationService.Models;

public sealed record Reservation
{
    public int Id { get; init; }
    public int CustomerId { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string CustomerEmail { get; init; } = string.Empty;
    public string CustomerPhone { get; init; } = string.Empty;
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public string BookingReference { get; init; } = string.Empty;
    public DateTime StartDateTime { get; init; }
    public DateTime EndDateTime { get; init; }
    public int GuestCount { get; init; }
    public string Status { get; init; } = "Pending";
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
