namespace ReservationService.Events;

public sealed record OrderLifecycleEvent
{
    public Guid EventId { get; init; }

    public string EventType { get; init; } = string.Empty;

    public int EventVersion { get; init; } = 1;

    public DateTime OccurredAt { get; init; }

    public int OrderId { get; init; }

    public string OrderReference { get; init; } = string.Empty;

    public string OrderType { get; init; } = string.Empty;

    public string? PreviousStatus { get; init; }

    public string CurrentStatus { get; init; } = string.Empty;

    public int? TableId { get; init; }

    public int? ReservationId { get; init; }

    public string? CorrelationId { get; init; }
}
