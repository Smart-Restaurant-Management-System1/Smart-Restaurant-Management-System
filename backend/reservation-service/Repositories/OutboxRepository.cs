using System.Data;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Repositories;

/// <summary>
/// SR-115: Parameterized ADO.NET repository for ReservationOutbox.
/// InsertAsync participates in the caller's existing transaction (no own connection/transaction).
/// All other methods open their own short-lived connections.
/// No database lock is held during Kafka network calls.
/// </summary>
public sealed class OutboxRepository(DatabaseHelper databaseHelper) : IOutboxRepository
{
    // ── In-transaction insert (called by ReservationRepository before commit) ───────────────

    public async Task InsertAsync(MySqlConnection connection, MySqlTransaction transaction, OutboxEvent outboxEvent, CancellationToken cancellationToken = default)
    {
        const string sql = @"
INSERT INTO ReservationOutbox
    (EventId, EventType, SchemaVersion, AggregateType, AggregateId, MessageKey,
     Payload, OccurredAtUtc, CreatedAtUtc, AttemptCount, Status)
VALUES
    (@EventId, @EventType, @SchemaVersion, @AggregateType, @AggregateId, @MessageKey,
     @Payload, @OccurredAtUtc, @CreatedAtUtc, 0, 'Pending');";
        await using var cmd = new MySqlCommand(sql, connection, transaction);
        cmd.Parameters.AddWithValue("@EventId", outboxEvent.EventId.ToString());
        cmd.Parameters.AddWithValue("@EventType", outboxEvent.EventType);
        cmd.Parameters.AddWithValue("@SchemaVersion", outboxEvent.SchemaVersion);
        cmd.Parameters.AddWithValue("@AggregateType", outboxEvent.AggregateType);
        cmd.Parameters.AddWithValue("@AggregateId", outboxEvent.AggregateId);
        cmd.Parameters.AddWithValue("@MessageKey", outboxEvent.MessageKey);
        cmd.Parameters.AddWithValue("@Payload", outboxEvent.Payload);
        cmd.Parameters.AddWithValue("@OccurredAtUtc", outboxEvent.OccurredAtUtc);
        cmd.Parameters.AddWithValue("@CreatedAtUtc", DateTime.UtcNow);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    // ── Publisher operations (own connections — never hold open during Kafka I/O) ────────────

    public async Task<IReadOnlyList<OutboxEvent>> ClaimBatchAsync(Guid lockId, int batchSize, TimeSpan leaseDuration, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        // Recover expired leases first so they become eligible in the same batch.
        await RecoverExpiredClaimsInternalAsync(connection, transaction, cancellationToken);

        // SELECT the IDs of eligible rows (Pending, NextAttemptAtUtc is null or in the past).
        // Deterministic order: OccurredAtUtc ASC, Id ASC — oldest events published first.
        const string selectSql = @"
SELECT Id FROM ReservationOutbox
WHERE Status = 'Pending'
  AND (NextAttemptAtUtc IS NULL OR NextAttemptAtUtc <= @Now)
ORDER BY OccurredAtUtc ASC, Id ASC
LIMIT @BatchSize
FOR UPDATE SKIP LOCKED;";

        var ids = new List<long>();
        await using (var selectCmd = new MySqlCommand(selectSql, connection, transaction))
        {
            selectCmd.Parameters.AddWithValue("@Now", DateTime.UtcNow);
            selectCmd.Parameters.AddWithValue("@BatchSize", batchSize);
            await using var reader = await selectCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                ids.Add(reader.GetInt64(0));
        }

        if (ids.Count == 0)
        {
            await transaction.CommitAsync(cancellationToken);
            return Array.Empty<OutboxEvent>();
        }

        // Claim the selected rows atomically.
        var lockedUntil = DateTime.UtcNow.Add(leaseDuration);
        var inClause = string.Join(",", ids.Select((_, i) => $"@Id{i}"));
        var updateSql = $@"
UPDATE ReservationOutbox
SET Status = 'Processing', LockId = @LockId, LockedUntilUtc = @LockedUntil
WHERE Id IN ({inClause}) AND Status = 'Pending';";

        await using (var updateCmd = new MySqlCommand(updateSql, connection, transaction))
        {
            updateCmd.Parameters.AddWithValue("@LockId", lockId.ToString());
            updateCmd.Parameters.AddWithValue("@LockedUntil", lockedUntil);
            for (int i = 0; i < ids.Count; i++)
                updateCmd.Parameters.AddWithValue($"@Id{i}", ids[i]);
            await updateCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        // Read the full rows while still in the short claim transaction.
        var inClause2 = string.Join(",", ids.Select((_, i) => $"@Rid{i}"));
        var readSql = $"SELECT * FROM ReservationOutbox WHERE Id IN ({inClause2}) ORDER BY OccurredAtUtc ASC, Id ASC;";
        var events = new List<OutboxEvent>();
        await using (var readCmd = new MySqlCommand(readSql, connection, transaction))
        {
            for (int i = 0; i < ids.Count; i++)
                readCmd.Parameters.AddWithValue($"@Rid{i}", ids[i]);
            await using var reader = await readCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                events.Add(MapRow(reader));
        }

        await transaction.CommitAsync(cancellationToken);
        return events;
    }

    public async Task MarkProcessedAsync(long outboxId, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"UPDATE ReservationOutbox
SET Status = 'Processed', ProcessedAtUtc = @Now, LockId = NULL, LockedUntilUtc = NULL
WHERE Id = @Id;";
        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Now", DateTime.UtcNow);
        cmd.Parameters.AddWithValue("@Id", outboxId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task RecordFailureAsync(long outboxId, int attemptCount, DateTime nextAttemptAtUtc, string? lastError, int maxAttempts, CancellationToken cancellationToken = default)
    {
        var newStatus = attemptCount >= maxAttempts ? OutboxEventStatus.DeadLetter : OutboxEventStatus.Pending;
        // Truncate error to 512 chars; never store credentials or full stack traces in production.
        var safeError = lastError is null ? null : lastError.Length > 512 ? lastError[..512] : lastError;
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"UPDATE ReservationOutbox
SET Status = @Status,
    AttemptCount = @AttemptCount,
    NextAttemptAtUtc = @NextAttempt,
    LastError = @LastError,
    LockId = NULL,
    LockedUntilUtc = NULL
WHERE Id = @Id;";
        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Status", newStatus);
        cmd.Parameters.AddWithValue("@AttemptCount", attemptCount);
        cmd.Parameters.AddWithValue("@NextAttempt", attemptCount >= maxAttempts ? (object)DBNull.Value : nextAttemptAtUtc);
        cmd.Parameters.AddWithValue("@LastError", (object?)safeError ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Id", outboxId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task RecoverExpiredClaimsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await RecoverExpiredClaimsInternalAsync(connection, null, cancellationToken);
    }

    public async Task<IReadOnlyList<OutboxEvent>> GetByStatusAsync(string status, int limit, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = "SELECT * FROM ReservationOutbox WHERE Status = @Status ORDER BY OccurredAtUtc ASC, Id ASC LIMIT @Limit;";
        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Status", status);
        cmd.Parameters.AddWithValue("@Limit", limit);
        var results = new List<OutboxEvent>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            results.Add(MapRow(reader));
        return results;
    }

    // ── Private helpers ─────────────────────────────────────────────────────────────────────

    private static async Task RecoverExpiredClaimsInternalAsync(MySqlConnection connection, MySqlTransaction? transaction, CancellationToken cancellationToken)
    {
        const string sql = @"UPDATE ReservationOutbox
SET Status = 'Pending', LockId = NULL, LockedUntilUtc = NULL
WHERE Status = 'Processing' AND LockedUntilUtc < @Now;";
        await using var cmd = transaction is null
            ? new MySqlCommand(sql, connection)
            : new MySqlCommand(sql, connection, transaction);
        cmd.Parameters.AddWithValue("@Now", DateTime.UtcNow);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static OutboxEvent MapRow(MySqlDataReader reader) => new()
    {
        Id = reader.GetInt64("Id"),
        EventId = Guid.Parse(reader.GetString("EventId")),
        EventType = reader.GetString("EventType"),
        SchemaVersion = reader.GetInt32("SchemaVersion"),
        AggregateType = reader.GetString("AggregateType"),
        AggregateId = reader.GetInt32("AggregateId"),
        MessageKey = reader.GetString("MessageKey"),
        Payload = reader.GetString("Payload"),
        OccurredAtUtc = reader.GetDateTime("OccurredAtUtc"),
        CreatedAtUtc = reader.GetDateTime("CreatedAtUtc"),
        ProcessedAtUtc = reader.IsDBNull(reader.GetOrdinal("ProcessedAtUtc")) ? null : reader.GetDateTime("ProcessedAtUtc"),
        AttemptCount = reader.GetInt32("AttemptCount"),
        NextAttemptAtUtc = reader.IsDBNull(reader.GetOrdinal("NextAttemptAtUtc")) ? null : reader.GetDateTime("NextAttemptAtUtc"),
        LastError = reader.IsDBNull(reader.GetOrdinal("LastError")) ? null : reader.GetString("LastError"),
        Status = reader.GetString("Status"),
        LockId = reader.IsDBNull(reader.GetOrdinal("LockId")) ? null : Guid.Parse(reader.GetString("LockId")),
        LockedUntilUtc = reader.IsDBNull(reader.GetOrdinal("LockedUntilUtc")) ? null : reader.GetDateTime("LockedUntilUtc"),
    };
}
