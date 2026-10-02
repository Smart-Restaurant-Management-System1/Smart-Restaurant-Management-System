namespace ReservationService.Models;

public sealed record CustomerFeedback
{
    public int FeedbackId { get; init; }
    public int CustomerId { get; init; }
    public int? ReservationId { get; init; }
    public int? OrderId { get; init; }
    public string? OrderType { get; init; }
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
