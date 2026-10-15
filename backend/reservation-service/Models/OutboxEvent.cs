namespace ReservationService.Models;

/// <summary>
/// Outbox state machine:
///   Pending    → Processing → Processed   (happy path)
///   Processing → Pending    (on expired lease recovery)
///   Pending    → DeadLetter (on AttemptCount ≥ MaxAttempts)
///   Processing → DeadLetter (on AttemptCount ≥ MaxAttempts after failure)
/// Records are never deleted — use a separate retention/cleanup job.
/// </summary>
public static class OutboxEventStatus
{
    public const string Pending = "Pending";
    public const string Processing = "Processing";
    public const string Processed = "Processed";
    public const string DeadLetter = "DeadLetter";
}

/// <summary>Represents one row in the ReservationOutbox table.</summary>
public sealed record OutboxEvent
{
    public long Id { get; init; }
    public Guid EventId { get; init; }
    public string EventType { get; init; } = string.Empty;
    public int SchemaVersion { get; init; }
    public string AggregateType { get; init; } = "Reservation";
    public int AggregateId { get; init; }
    public string MessageKey { get; init; } = string.Empty;
    public string Payload { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? ProcessedAtUtc { get; init; }
    public int AttemptCount { get; init; }
    public DateTime? NextAttemptAtUtc { get; init; }
    public string? LastError { get; init; }
    public string Status { get; init; } = OutboxEventStatus.Pending;
    public Guid? LockId { get; init; }
    public DateTime? LockedUntilUtc { get; init; }
}
