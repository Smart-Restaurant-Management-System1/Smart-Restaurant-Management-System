using System.Data;
using System.Globalization;
using System.Text.Json;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Repositories;

/// <summary>
/// SR-62 locking workflow: one transaction locks a physical table before the overlap recheck and insert.
/// SR-115: Every successful reservation write also inserts one row into ReservationOutbox inside the same
/// MySQL transaction. Reservation change and outbox insert commit atomically — both succeed or both fail.
/// The background publisher (SR-112) reads outbox rows and publishes to Kafka after the transaction commits.
/// </summary>
public sealed class ReservationRepository(
    DatabaseHelper databaseHelper,
    IBookingReferenceGenerator referenceGenerator,
    ReservationMaintenancePolicy maintenancePolicy,
    IOutboxRepository outboxRepository) : IReservationRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    // ── Read operations ─────────────────────────────────────────────────────────────────────

    public async Task<ReservationHistoryPage> GetForAdminAsync(AdminReservationQuery query, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        var (where, parameters) = BuildAdminFilters(query);
        await using var count = new MySqlCommand($"SELECT COUNT(*) FROM Reservations AS r LEFT JOIN RestaurantTables AS t ON t.Id = r.TableId {where};", connection);
        AddParameters(count, parameters);
        var total = Convert.ToInt32(await count.ExecuteScalarAsync(cancellationToken));
        const string columns = "r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt";
        await using var command = new MySqlCommand($"SELECT {columns} FROM Reservations AS r LEFT JOIN RestaurantTables AS t ON t.Id = r.TableId {where} ORDER BY r.StartDateTime DESC, r.Id DESC LIMIT @PageSize OFFSET @Offset;", connection);
        AddParameters(command, parameters);
        command.Parameters.AddWithValue("@PageSize", query.PageSize);
        command.Parameters.AddWithValue("@Offset", (query.Page - 1) * query.PageSize);
        var items = new List<Reservation>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) items.Add(MapReservation(reader));
        return new ReservationHistoryPage(items, query.Page, query.PageSize, total);
    }

    public async Task<Reservation?> GetByIdAsync(int reservationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"SELECT r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations AS r LEFT JOIN RestaurantTables AS t ON t.Id = r.TableId WHERE r.Id = @Id;";
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", reservationId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapReservation(reader) : null;
    }

    public async Task<Reservation?> GetByIdForCustomerAsync(int reservationId, int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"SELECT r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations AS r LEFT JOIN RestaurantTables AS t ON t.Id = r.TableId WHERE r.Id = @Id AND r.CustomerId = @CustomerId;";
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", reservationId);
        command.Parameters.AddWithValue("@CustomerId", customerId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapReservation(reader) : null;
    }

    public async Task<ReservationHistoryPage> GetHistoryForCustomerAsync(int customerId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string countSql = "SELECT COUNT(*) FROM Reservations WHERE CustomerId = @CustomerId;";
        await using var countCommand = new MySqlCommand(countSql, connection);
        countCommand.Parameters.AddWithValue("@CustomerId", customerId);
        var totalCount = Convert.ToInt32(await countCommand.ExecuteScalarAsync(cancellationToken));
        const string historySql = @"SELECT r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime,
r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations AS r LEFT JOIN RestaurantTables AS t ON t.Id = r.TableId
WHERE r.CustomerId = @CustomerId ORDER BY r.StartDateTime DESC, r.Id DESC LIMIT @PageSize OFFSET @Offset;";
        await using var command = new MySqlCommand(historySql, connection);
        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@PageSize", pageSize);
        command.Parameters.AddWithValue("@Offset", (page - 1) * pageSize);
        var reservations = new List<Reservation>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) reservations.Add(MapReservation(reader));
        return new ReservationHistoryPage(reservations, page, pageSize, totalCount);
    }

    public async Task<string?> GetStatusAsync(int reservationId, int? customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = "SELECT Status FROM Reservations WHERE Id = @Id AND (@CustomerId IS NULL OR CustomerId = @CustomerId);";
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", reservationId);
        command.Parameters.AddWithValue("@CustomerId", (object?)customerId ?? DBNull.Value);
        return (await command.ExecuteScalarAsync(cancellationToken)) as string;
    }

    // ── Write operations (each inserts an outbox event atomically) ───────────────────────────

    /// <summary>
    /// SR-115: Status update for admin lifecycle changes (Pending→Confirmed, Confirmed→Completed, →Cancelled).
    /// Wraps in a transaction so the reservation UPDATE and outbox INSERT are atomic.
    /// The FOR UPDATE lock prevents a concurrent status change between our read and write.
    /// Emits ReservationCancelled for →Cancelled transitions; ReservationStatusChanged for all others.
    /// No outbox row is created if the update does not affect any row (already transitioned).
    /// </summary>
    public async Task<bool> UpdateStatusAsync(int reservationId, int? customerId, string currentStatus, string targetStatus, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            // Lock the row and fetch fields needed for the event envelope.
            const string selectSql = @"
SELECT r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference,
       r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations r LEFT JOIN RestaurantTables t ON t.Id = r.TableId
WHERE r.Id = @Id AND (@CustomerId IS NULL OR r.CustomerId = @CustomerId)
AND r.Status = @CurrentStatus FOR UPDATE;";
            Reservation? existing = null;
            await using (var sel = new MySqlCommand(selectSql, connection, transaction))
            {
                sel.Parameters.AddWithValue("@Id", reservationId);
                sel.Parameters.AddWithValue("@CustomerId", (object?)customerId ?? DBNull.Value);
                sel.Parameters.AddWithValue("@CurrentStatus", currentStatus);
                await using var reader = await sel.ExecuteReaderAsync(cancellationToken);
                if (await reader.ReadAsync(cancellationToken)) existing = MapReservation(reader);
            }
            if (existing is null) { await transaction.RollbackAsync(cancellationToken); return false; }

            var now = DateTime.UtcNow;
            const string updateSql = @"UPDATE Reservations SET Status = @TargetStatus, UpdatedAt = @UpdatedAt
WHERE Id = @Id AND Status = @CurrentStatus AND (@CustomerId IS NULL OR CustomerId = @CustomerId);";
            int affected;
            await using (var upd = new MySqlCommand(updateSql, connection, transaction))
            {
                upd.Parameters.AddWithValue("@Id", reservationId);
                upd.Parameters.AddWithValue("@CustomerId", (object?)customerId ?? DBNull.Value);
                upd.Parameters.AddWithValue("@CurrentStatus", currentStatus);
                upd.Parameters.AddWithValue("@TargetStatus", targetStatus);
                upd.Parameters.AddWithValue("@UpdatedAt", now);
                affected = await upd.ExecuteNonQueryAsync(cancellationToken);
            }
            if (affected != 1) { await transaction.RollbackAsync(cancellationToken); return false; }

            var updated = existing with { Status = targetStatus, UpdatedAt = now };
            var occurredAt = new DateTimeOffset(now, TimeSpan.Zero);
            var envelope = targetStatus == ReservationStatus.Cancelled
                ? ReservationEventFactory.Cancelled(updated, occurredAt)
                : ReservationEventFactory.StatusChanged(updated, currentStatus, occurredAt);
            await InsertOutboxAsync(connection, transaction, envelope, reservationId, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch
        {
            try { await transaction.RollbackAsync(cancellationToken); } catch { /* preserve original */ }
            throw;
        }
    }

    /// <summary>
    /// SR-115: Atomically create a reservation and its outbox event.
    /// Idempotent replays do NOT create a new outbox row (no new state change occurred).
    /// </summary>
    public async Task<ReservationCreateResult> CreateAtomicallyAsync(ReservationCreationCommand command, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var table = await LockTableAsync(connection, transaction, command.TableId, cancellationToken);
            if (table is null) { await transaction.RollbackAsync(cancellationToken); return new(ReservationCreateOutcome.TableNotFound); }
            if (!string.IsNullOrWhiteSpace(command.IdempotencyKey))
            {
                var replay = await FindIdempotentReservationAsync(connection, transaction, command, cancellationToken);
                // Idempotent replay: the reservation already exists; no new state, no new outbox event.
                if (replay is not null) { await transaction.CommitAsync(cancellationToken); return new(ReservationCreateOutcome.Replayed, replay); }
            }
            if (!table.Value.IsActive || table.Value.Capacity < command.Period.GuestCount)
            { await transaction.RollbackAsync(cancellationToken); return new(ReservationCreateOutcome.Unavailable); }
            if (await HasBlockingOverlapAsync(connection, transaction, command, cancellationToken))
            { await transaction.RollbackAsync(cancellationToken); return new(ReservationCreateOutcome.Unavailable); }

            for (var attempt = 0; attempt < 3; attempt++)
            {
                var reservation = new Reservation
                {
                    CustomerId = command.CustomerId, TableId = command.TableId, TableNumber = table.Value.TableNumber,
                    BookingReference = referenceGenerator.Generate(), StartDateTime = command.Period.RequestedStart,
                    EndDateTime = command.Period.RequestedEnd, GuestCount = command.Period.GuestCount,
                    Status = ReservationStatus.Pending, CreatedAt = DateTime.UtcNow
                };
                try
                {
                    reservation = await InsertReservationAsync(connection, transaction, reservation, command.IdempotencyKey, cancellationToken);
                    // SR-115: insert outbox row inside the same transaction — both commit together.
                    var envelope = ReservationEventFactory.Created(reservation, DateTimeOffset.UtcNow);
                    await InsertOutboxAsync(connection, transaction, envelope, reservation.Id, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                    return new(ReservationCreateOutcome.Created, reservation);
                }
                catch (MySqlException ex) when (ex.Number == 1062 && attempt < 2)
                {
                    // Booking-reference collision (extremely unlikely); retry inside the locked transaction.
                }
            }
            throw new InvalidOperationException("Unable to generate a unique booking reference.");
        }
        catch
        {
            try { await transaction.RollbackAsync(cancellationToken); } catch { /* preserve original failure */ }
            throw;
        }
    }

    /// <summary>SR-115: Reschedule and outbox insert are atomic.</summary>
    public async Task<ReservationRescheduleResult> RescheduleAtomicallyAsync(ReservationRescheduleCommand command, CancellationToken cancellationToken = default)
    {
        var visible = command.IsAdmin
            ? await GetByIdAsync(command.ReservationId, cancellationToken)
            : await GetByIdForCustomerAsync(command.ReservationId, command.ActorUserId, cancellationToken);
        if (visible is null) return new(ReservationRescheduleOutcome.NotFound);

        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var table = await LockTableAsync(connection, transaction, command.TableId, cancellationToken);
            if (table is null) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.TableNotFound); }
            var existing = await LockReservationAsync(connection, transaction, command.ReservationId, cancellationToken);
            if (existing is null) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.NotFound); }
            if (!command.IsAdmin && existing.CustomerId != command.ActorUserId) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.NotFound); }
            if (!maintenancePolicy.CanReschedule(existing, command.IsAdmin)) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.InvalidState); }
            if (command.Period.RequestedStart <= maintenancePolicy.RestaurantNow) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.InvalidState); }
            if (!table.Value.IsActive || table.Value.Capacity < command.Period.GuestCount) { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.Unavailable); }
            if (await HasBlockingOverlapAsync(connection, transaction, command.TableId, command.Period.RequestedStart, command.Period.RequestedEnd, command.ReservationId, cancellationToken))
            { await transaction.RollbackAsync(cancellationToken); return new(ReservationRescheduleOutcome.Unavailable); }

            var updated = await UpdateScheduleAsync(connection, transaction, existing, command, table.Value.TableNumber, cancellationToken);
            var envelope = ReservationEventFactory.Updated(updated, DateTimeOffset.UtcNow);
            await InsertOutboxAsync(connection, transaction, envelope, updated.Id, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(ReservationRescheduleOutcome.Updated, updated);
        }
        catch
        {
            try { await transaction.RollbackAsync(cancellationToken); } catch { /* preserve original exception */ }
            throw;
        }
    }

    /// <summary>
    /// SR-115: Customer cancellation and outbox insert are atomic.
    /// Idempotent replays (already Cancelled) produce NO new outbox row — no new state change.
    /// </summary>
    public async Task<ReservationCancellationResult> CancelForCustomerAtomicallyAsync(int reservationId, int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var existing = await LockReservationAsync(connection, transaction, reservationId, cancellationToken);
        if (existing is null || existing.CustomerId != customerId) return new(ReservationCancellationOutcome.NotFound);
        if (existing.Status != ReservationStatus.Cancelled && !maintenancePolicy.CanCustomerMaintain(existing))
            return new(ReservationCancellationOutcome.InvalidState);

        await using (var tbl = new MySqlCommand("SELECT TableNumber FROM RestaurantTables WHERE Id=@TableId;", connection, transaction))
        {
            tbl.Parameters.AddWithValue("@TableId", existing.TableId);
            existing = existing with { TableNumber = (string)(await tbl.ExecuteScalarAsync(cancellationToken))! };
        }

        if (existing.Status != ReservationStatus.Cancelled)
        {
            var now = maintenancePolicy.UtcNow;
            await using var update = new MySqlCommand(
                "UPDATE Reservations SET Status=@Status, UpdatedAt=@UpdatedAt WHERE Id=@Id AND CustomerId=@CustomerId;",
                connection, transaction);
            update.Parameters.AddWithValue("@Status", ReservationStatus.Cancelled);
            update.Parameters.AddWithValue("@UpdatedAt", now);
            update.Parameters.AddWithValue("@Id", reservationId);
            update.Parameters.AddWithValue("@CustomerId", customerId);
            if (await update.ExecuteNonQueryAsync(cancellationToken) != 1)
                throw new InvalidOperationException("Cancellation did not update one row.");
            existing = existing with { Status = ReservationStatus.Cancelled, UpdatedAt = now };
            // SR-115: only insert outbox on actual state transition (not on idempotent replay).
            var envelope = ReservationEventFactory.Cancelled(existing, new DateTimeOffset(now, TimeSpan.Zero));
            await InsertOutboxAsync(connection, transaction, envelope, reservationId, cancellationToken);
        }
        // Idempotent replay: already Cancelled — commit no-op, produce no duplicate event.
        await transaction.CommitAsync(cancellationToken);
        return new(ReservationCancellationOutcome.Cancelled, existing);
    }

    // ── Private: table lock ──────────────────────────────────────────────────────────────────

    private static async Task<(string TableNumber, int Capacity, bool IsActive)?> LockTableAsync(MySqlConnection connection, MySqlTransaction transaction, int tableId, CancellationToken token)
    {
        using var command = new MySqlCommand("SELECT TableNumber, Capacity, IsActive FROM RestaurantTables WHERE Id = @TableId FOR UPDATE;", connection, transaction);
        command.Parameters.AddWithValue("@TableId", tableId);
        using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return (reader.GetString("TableNumber"), reader.GetInt32("Capacity"), reader.GetBoolean("IsActive"));
    }

    // ── Private: overlap check ───────────────────────────────────────────────────────────────

    private static async Task<bool> HasBlockingOverlapAsync(MySqlConnection connection, MySqlTransaction transaction, ReservationCreationCommand command, CancellationToken token) =>
        await HasBlockingOverlapAsync(connection, transaction, command.TableId, command.Period.RequestedStart, command.Period.RequestedEnd, null, token);

    /// <summary>Canonical half-open interval rule. An optional ID prevents a reschedule from conflicting with itself.</summary>
    private static async Task<bool> HasBlockingOverlapAsync(MySqlConnection connection, MySqlTransaction transaction, int tableId, DateTime requestedStart, DateTime requestedEnd, int? excludedReservationId, CancellationToken token)
    {
        const string sql = @"SELECT EXISTS(SELECT 1 FROM Reservations WHERE TableId = @TableId
AND Status IN (@PendingStatus, @ConfirmedStatus)
AND StartDateTime < @RequestedEnd AND EndDateTime > @RequestedStart
AND (@ExcludedReservationId IS NULL OR Id <> @ExcludedReservationId));";
        using var check = new MySqlCommand(sql, connection, transaction);
        check.Parameters.AddWithValue("@TableId", tableId);
        check.Parameters.AddWithValue("@PendingStatus", ReservationStatus.Pending);
        check.Parameters.AddWithValue("@ConfirmedStatus", ReservationStatus.Confirmed);
        check.Parameters.AddWithValue("@RequestedStart", requestedStart);
        check.Parameters.AddWithValue("@RequestedEnd", requestedEnd);
        check.Parameters.AddWithValue("@ExcludedReservationId", (object?)excludedReservationId ?? DBNull.Value);
        return Convert.ToInt32(await check.ExecuteScalarAsync(token)) == 1;
    }

    // ── Private: row lock ────────────────────────────────────────────────────────────────────

    private static async Task<Reservation?> LockReservationAsync(MySqlConnection connection, MySqlTransaction transaction, int reservationId, CancellationToken token)
    {
        const string sql = @"SELECT r.Id, r.CustomerId, r.TableId, COALESCE(t.TableNumber, '') AS TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations r LEFT JOIN RestaurantTables t ON t.Id = r.TableId WHERE r.Id = @Id FOR UPDATE;";
        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@Id", reservationId);
        using var reader = await command.ExecuteReaderAsync(token);
        return await reader.ReadAsync(token) ? MapReservation(reader) : null;
    }

    // ── Private: DML helpers ─────────────────────────────────────────────────────────────────

    private static async Task<Reservation> UpdateScheduleAsync(MySqlConnection connection, MySqlTransaction transaction, Reservation existing, ReservationRescheduleCommand command, string tableNumber, CancellationToken token)
    {
        const string sql = @"UPDATE Reservations SET TableId=@TableId, StartDateTime=@StartDateTime, EndDateTime=@EndDateTime, GuestCount=@GuestCount, UpdatedAt=@UpdatedAt WHERE Id=@Id;";
        using var update = new MySqlCommand(sql, connection, transaction);
        update.Parameters.AddWithValue("@Id", existing.Id);
        update.Parameters.AddWithValue("@TableId", command.TableId);
        update.Parameters.AddWithValue("@StartDateTime", command.Period.RequestedStart);
        update.Parameters.AddWithValue("@EndDateTime", command.Period.RequestedEnd);
        update.Parameters.AddWithValue("@GuestCount", command.Period.GuestCount);
        var now = DateTime.UtcNow;
        update.Parameters.AddWithValue("@UpdatedAt", now);
        if (await update.ExecuteNonQueryAsync(token) != 1) throw new InvalidOperationException("Reservation update did not affect exactly one row.");
        return existing with { TableId = command.TableId, TableNumber = tableNumber, StartDateTime = command.Period.RequestedStart, EndDateTime = command.Period.RequestedEnd, GuestCount = command.Period.GuestCount, UpdatedAt = now };
    }

    private static async Task<Reservation> InsertReservationAsync(MySqlConnection connection, MySqlTransaction transaction, Reservation reservation, string? idempotencyKey, CancellationToken token)
    {
        const string sql = @"INSERT INTO Reservations (CustomerId, TableId, BookingReference, StartDateTime, EndDateTime, GuestCount, Status, IdempotencyKey, CreatedAt, UpdatedAt)
VALUES (@CustomerId, @TableId, @BookingReference, @StartDateTime, @EndDateTime, @GuestCount, @Status, @IdempotencyKey, @CreatedAt, @UpdatedAt); SELECT LAST_INSERT_ID();";
        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@CustomerId", reservation.CustomerId);
        command.Parameters.AddWithValue("@TableId", reservation.TableId);
        command.Parameters.AddWithValue("@BookingReference", reservation.BookingReference);
        command.Parameters.AddWithValue("@StartDateTime", reservation.StartDateTime);
        command.Parameters.AddWithValue("@EndDateTime", reservation.EndDateTime);
        command.Parameters.AddWithValue("@GuestCount", reservation.GuestCount);
        command.Parameters.AddWithValue("@Status", reservation.Status);
        command.Parameters.AddWithValue("@IdempotencyKey", (object?)idempotencyKey ?? DBNull.Value);
        command.Parameters.AddWithValue("@CreatedAt", reservation.CreatedAt);
        command.Parameters.AddWithValue("@UpdatedAt", reservation.CreatedAt);
        var id = Convert.ToInt32(await command.ExecuteScalarAsync(token));
        return reservation with { Id = id };
    }

    private static async Task<Reservation?> FindIdempotentReservationAsync(MySqlConnection connection, MySqlTransaction transaction, ReservationCreationCommand command, CancellationToken token)
    {
        const string sql = @"SELECT r.Id, r.CustomerId, r.TableId, t.TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations r INNER JOIN RestaurantTables t ON t.Id = r.TableId WHERE r.CustomerId = @CustomerId AND r.IdempotencyKey = @IdempotencyKey FOR UPDATE;";
        using var query = new MySqlCommand(sql, connection, transaction);
        query.Parameters.AddWithValue("@CustomerId", command.CustomerId);
        query.Parameters.AddWithValue("@IdempotencyKey", command.IdempotencyKey);
        using var reader = await query.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return MapReservation(reader);
    }

    // ── Private: outbox helper ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Serialize the event envelope and insert into ReservationOutbox inside the caller's transaction.
    /// Message key is always reservationId.ToString() for deterministic Kafka partition ordering.
    /// </summary>
    private async Task InsertOutboxAsync(MySqlConnection connection, MySqlTransaction transaction,
        ReservationEventEnvelope envelope, int reservationId, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(envelope, JsonOptions);
        var outboxEvent = new OutboxEvent
        {
            EventId = envelope.EventId,
            EventType = envelope.EventType,
            SchemaVersion = envelope.SchemaVersion,
            AggregateType = "Reservation",
            AggregateId = reservationId,
            MessageKey = reservationId.ToString(CultureInfo.InvariantCulture),
            Payload = payload,
            OccurredAtUtc = envelope.OccurredAtUtc.UtcDateTime,
        };
        await outboxRepository.InsertAsync(connection, transaction, outboxEvent, cancellationToken);
    }

    // ── Private: mapping + filters ───────────────────────────────────────────────────────────

    private static Reservation MapReservation(MySqlDataReader reader) => new()
    {
        Id = reader.GetInt32("Id"),
        CustomerId = reader.GetInt32("CustomerId"),
        TableId = reader.GetInt32("TableId"),
        TableNumber = reader.GetString("TableNumber"),
        BookingReference = reader.GetString("BookingReference"),
        StartDateTime = reader.GetDateTime("StartDateTime"),
        EndDateTime = reader.GetDateTime("EndDateTime"),
        GuestCount = reader.GetInt32("GuestCount"),
        Status = reader.GetString("Status"),
        CreatedAt = reader.GetDateTime("CreatedAt"),
        UpdatedAt = reader.GetDateTime("UpdatedAt"),
    };

    private static (string Where, Dictionary<string, object> Parameters) BuildAdminFilters(AdminReservationQuery query)
    {
        var clauses = new List<string>();
        var parameters = new Dictionary<string, object>();
        if (query.VisitFrom is not null) { clauses.Add("r.StartDateTime >= @VisitFrom"); parameters["@VisitFrom"] = query.VisitFrom.Value.ToDateTime(TimeOnly.MinValue); }
        if (query.VisitTo is not null) { clauses.Add("r.StartDateTime < @VisitToExclusive"); parameters["@VisitToExclusive"] = query.VisitTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue); }
        if (!string.IsNullOrWhiteSpace(query.Status)) { clauses.Add("r.Status = @Status"); parameters["@Status"] = query.Status; }
        if (!string.IsNullOrWhiteSpace(query.TableNumber)) { clauses.Add("t.TableNumber LIKE @TableNumber"); parameters["@TableNumber"] = $"%{query.TableNumber}%"; }
        if (!string.IsNullOrWhiteSpace(query.BookingReference)) { clauses.Add("r.BookingReference LIKE @BookingReference"); parameters["@BookingReference"] = $"%{query.BookingReference}%"; }
        return (clauses.Count == 0 ? string.Empty : "WHERE " + string.Join(" AND ", clauses), parameters);
    }

    private static void AddParameters(MySqlCommand command, Dictionary<string, object> parameters)
    {
        foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
    }
}
