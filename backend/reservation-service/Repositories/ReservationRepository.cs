using System.Data;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Repositories;

/// <summary>SR-62 locking workflow: one transaction locks a physical table before the overlap recheck and insert.</summary>
public sealed class ReservationRepository(DatabaseHelper databaseHelper, IBookingReferenceGenerator referenceGenerator) : IReservationRepository
{
    public async Task<ReservationHistoryPage> GetHistoryForCustomerAsync(int customerId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string countSql = "SELECT COUNT(*) FROM Reservations WHERE CustomerId = @CustomerId;";
        await using var countCommand = new MySqlCommand(countSql, connection);
        countCommand.Parameters.AddWithValue("@CustomerId", customerId);
        var totalCount = Convert.ToInt32(await countCommand.ExecuteScalarAsync(cancellationToken));

        const string historySql = @"SELECT r.Id, r.CustomerId, r.TableId, t.TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime,
r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations AS r INNER JOIN RestaurantTables AS t ON t.Id = r.TableId
WHERE r.CustomerId = @CustomerId
ORDER BY r.StartDateTime DESC, r.Id DESC
LIMIT @PageSize OFFSET @Offset;";
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

    public async Task<bool> UpdateStatusAsync(int reservationId, int? customerId, string currentStatus, string targetStatus, CancellationToken cancellationToken = default)
    {
        await using var connection = await databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"UPDATE Reservations SET Status = @TargetStatus, UpdatedAt = @UpdatedAt
WHERE Id = @Id AND Status = @CurrentStatus AND (@CustomerId IS NULL OR CustomerId = @CustomerId);";
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", reservationId);
        command.Parameters.AddWithValue("@CustomerId", (object?)customerId ?? DBNull.Value);
        command.Parameters.AddWithValue("@CurrentStatus", currentStatus);
        command.Parameters.AddWithValue("@TargetStatus", targetStatus);
        command.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

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
                if (replay is not null) { await transaction.CommitAsync(cancellationToken); return new(ReservationCreateOutcome.Replayed, replay); }
            }
            if (!table.Value.IsActive || table.Value.Capacity < command.Period.GuestCount) { await transaction.RollbackAsync(cancellationToken); return new(ReservationCreateOutcome.Unavailable); }

            if (await HasBlockingOverlapAsync(connection, transaction, command, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return new(ReservationCreateOutcome.Unavailable);
            }

            for (var attempt = 0; attempt < 3; attempt++)
            {
                var reservation = new Reservation
                {
                    CustomerId = command.CustomerId, TableId = command.TableId, TableNumber = table.Value.TableNumber,
                    BookingReference = referenceGenerator.Generate(), StartDateTime = command.Period.RequestedStart,
                    EndDateTime = command.Period.RequestedEnd, GuestCount = command.Period.GuestCount,
                    Status = "Pending", CreatedAt = DateTime.UtcNow
                };
                try
                {
                    reservation = await InsertAsync(connection, transaction, reservation, command.IdempotencyKey, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                    return new(ReservationCreateOutcome.Created, reservation);
                }
                catch (MySqlException ex) when (ex.Number == 1062 && attempt < 2)
                {
                    // Extremely unlikely booking-reference collision; retry inside the same locked transaction.
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

    private static async Task<(string TableNumber, int Capacity, bool IsActive)?> LockTableAsync(MySqlConnection connection, MySqlTransaction transaction, int tableId, CancellationToken token)
    {
        using var command = new MySqlCommand("SELECT TableNumber, Capacity, IsActive FROM RestaurantTables WHERE Id = @TableId FOR UPDATE;", connection, transaction);
        command.Parameters.AddWithValue("@TableId", tableId);
        using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return (reader.GetString("TableNumber"), reader.GetInt32("Capacity"), reader.GetBoolean("IsActive"));
    }

    private static async Task<bool> HasBlockingOverlapAsync(MySqlConnection connection, MySqlTransaction transaction, ReservationCreationCommand command, CancellationToken token)
    {
        const string sql = @"SELECT EXISTS(SELECT 1 FROM Reservations WHERE TableId = @TableId
AND Status IN (@PendingStatus, @ConfirmedStatus)
AND StartDateTime < @RequestedEnd AND EndDateTime > @RequestedStart);";
        using var check = new MySqlCommand(sql, connection, transaction);
        check.Parameters.AddWithValue("@TableId", command.TableId);
        check.Parameters.AddWithValue("@PendingStatus", "Pending"); check.Parameters.AddWithValue("@ConfirmedStatus", "Confirmed");
        check.Parameters.AddWithValue("@RequestedStart", command.Period.RequestedStart); check.Parameters.AddWithValue("@RequestedEnd", command.Period.RequestedEnd);
        return Convert.ToInt32(await check.ExecuteScalarAsync(token)) == 1;
    }

    private static async Task<Reservation> InsertAsync(MySqlConnection connection, MySqlTransaction transaction, Reservation reservation, string? idempotencyKey, CancellationToken token)
    {
        const string sql = @"INSERT INTO Reservations (CustomerId, TableId, BookingReference, StartDateTime, EndDateTime, GuestCount, Status, IdempotencyKey, CreatedAt, UpdatedAt)
VALUES (@CustomerId, @TableId, @BookingReference, @StartDateTime, @EndDateTime, @GuestCount, @Status, @IdempotencyKey, @CreatedAt, @UpdatedAt); SELECT LAST_INSERT_ID();";
        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@CustomerId", reservation.CustomerId); command.Parameters.AddWithValue("@TableId", reservation.TableId);
        command.Parameters.AddWithValue("@BookingReference", reservation.BookingReference); command.Parameters.AddWithValue("@StartDateTime", reservation.StartDateTime);
        command.Parameters.AddWithValue("@EndDateTime", reservation.EndDateTime); command.Parameters.AddWithValue("@GuestCount", reservation.GuestCount);
        command.Parameters.AddWithValue("@Status", reservation.Status); command.Parameters.AddWithValue("@IdempotencyKey", (object?)idempotencyKey ?? DBNull.Value);
        command.Parameters.AddWithValue("@CreatedAt", reservation.CreatedAt); command.Parameters.AddWithValue("@UpdatedAt", reservation.CreatedAt);
        var id = Convert.ToInt32(await command.ExecuteScalarAsync(token));
        return reservation with { Id = id };
    }

    private static async Task<Reservation?> FindIdempotentReservationAsync(MySqlConnection connection, MySqlTransaction transaction, ReservationCreationCommand command, CancellationToken token)
    {
        const string sql = @"SELECT r.Id, r.CustomerId, r.TableId, t.TableNumber, r.BookingReference, r.StartDateTime, r.EndDateTime, r.GuestCount, r.Status, r.CreatedAt, r.UpdatedAt
FROM Reservations r INNER JOIN RestaurantTables t ON t.Id = r.TableId WHERE r.CustomerId = @CustomerId AND r.IdempotencyKey = @IdempotencyKey FOR UPDATE;";
        using var query = new MySqlCommand(sql, connection, transaction);
        query.Parameters.AddWithValue("@CustomerId", command.CustomerId); query.Parameters.AddWithValue("@IdempotencyKey", command.IdempotencyKey);
        using var reader = await query.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return MapReservation(reader);
    }

    private static Reservation MapReservation(MySqlDataReader reader) => new()
    {
        Id = reader.GetInt32("Id"), CustomerId = reader.GetInt32("CustomerId"), TableId = reader.GetInt32("TableId"),
        TableNumber = reader.GetString("TableNumber"), BookingReference = reader.GetString("BookingReference"),
        StartDateTime = reader.GetDateTime("StartDateTime"), EndDateTime = reader.GetDateTime("EndDateTime"),
        GuestCount = reader.GetInt32("GuestCount"), Status = reader.GetString("Status"), CreatedAt = reader.GetDateTime("CreatedAt"),
        UpdatedAt = reader.GetDateTime("UpdatedAt")
    };
}
