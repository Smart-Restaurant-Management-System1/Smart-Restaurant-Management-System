using MySqlConnector;
using ReservationService.Models;

namespace ReservationService.Repositories;

/// <summary>
/// SR-115: ADO.NET repository for the ReservationOutbox table.
/// InsertAsync participates in an existing business transaction (same connection + transaction).
/// All other methods use their own connections to avoid holding locks during Kafka I/O.
/// </summary>
public interface IOutboxRepository
{
    /// <summary>
    /// Insert an outbox row inside an existing MySQL transaction.
    /// Must be called before the caller commits so the reservation write and outbox insert are atomic.
    /// </summary>
    Task InsertAsync(MySqlConnection connection, MySqlTransaction transaction, OutboxEvent outboxEvent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Claim a bounded batch of eligible pending rows using a lease (LockId + LockedUntilUtc).
    /// Multiple publisher instances are safe: only one wins the optimistic lock per row.
    /// </summary>
    Task<IReadOnlyList<OutboxEvent>> ClaimBatchAsync(Guid lockId, int batchSize, TimeSpan leaseDuration, CancellationToken cancellationToken = default);

    /// <summary>Mark a row Processed after Kafka acknowledgement. Sets ProcessedAtUtc.</summary>
    Task MarkProcessedAsync(long outboxId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Record a failed attempt: increment AttemptCount, set NextAttemptAtUtc, store bounded LastError.
    /// Moves to DeadLetter when AttemptCount reaches maxAttempts.
    /// </summary>
    Task RecordFailureAsync(long outboxId, int attemptCount, DateTime nextAttemptAtUtc, string? lastError, int maxAttempts, CancellationToken cancellationToken = default);

    /// <summary>Recover rows whose lease has expired back to Pending so they can be claimed again.</summary>
    Task RecoverExpiredClaimsAsync(CancellationToken cancellationToken = default);

    /// <summary>For integration tests and operational diagnosis: query rows by status.</summary>
    Task<IReadOnlyList<OutboxEvent>> GetByStatusAsync(string status, int limit, CancellationToken cancellationToken = default);
}
