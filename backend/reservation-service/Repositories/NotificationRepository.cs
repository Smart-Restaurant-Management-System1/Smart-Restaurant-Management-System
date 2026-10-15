using System.Data;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Repositories;

public sealed class NotificationRepository : INotificationRepository
{
    private readonly DatabaseHelper _databaseHelper;

    public NotificationRepository(DatabaseHelper databaseHelper)
    {
        _databaseHelper = databaseHelper;
    }

    public async Task<int> CreateNotificationAsync(
        CustomerNotification notification,
        MySqlConnection? existingConnection = null,
        MySqlTransaction? existingTransaction = null,
        CancellationToken cancellationToken = default)
    {
        var shouldDisposeConnection = existingConnection is null;
        var connection = existingConnection ?? await _databaseHelper.CreateConnectionAsync(cancellationToken);

        try
        {
            const string sql = """
                INSERT INTO CustomerNotifications (
                    CustomerId, EventType, Title, Message, ReferenceType, ReferenceId, ReferenceCode, IsRead, ReadAt, IdempotencyKey, CreatedAt
                ) VALUES (
                    @CustomerId, @EventType, @Title, @Message, @ReferenceType, @ReferenceId, @ReferenceCode, @IsRead, @ReadAt, @IdempotencyKey, CURRENT_TIMESTAMP
                );
                SELECT LAST_INSERT_ID();
                """;

            await using var cmd = new MySqlCommand(sql, connection, existingTransaction);
            cmd.Parameters.AddWithValue("@CustomerId", notification.CustomerId);
            cmd.Parameters.AddWithValue("@EventType", notification.EventType);
            cmd.Parameters.AddWithValue("@Title", notification.Title);
            cmd.Parameters.AddWithValue("@Message", notification.Message);
            cmd.Parameters.AddWithValue("@ReferenceType", (object?)notification.ReferenceType ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ReferenceId", (object?)notification.ReferenceId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ReferenceCode", (object?)notification.ReferenceCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@IsRead", notification.IsRead ? 1 : 0);
            cmd.Parameters.AddWithValue("@ReadAt", (object?)notification.ReadAt ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@IdempotencyKey", (object?)notification.IdempotencyKey ?? DBNull.Value);

            try
            {
                var result = await cmd.ExecuteScalarAsync(cancellationToken);
                var id = Convert.ToInt32(result);
                notification.Id = id;
                return id;
            }
            catch (MySqlException ex) when (ex.Number == 1062) // Duplicate entry on IdempotencyKey
            {
                // Idempotent replay: return 0 without failing
                return 0;
            }
        }
        finally
        {
            if (shouldDisposeConnection)
            {
                await connection.DisposeAsync();
            }
        }
    }

    public async Task<(IReadOnlyList<CustomerNotification> Items, int TotalCount, int UnreadCount)> GetCustomerNotificationsAsync(
        int customerId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        // 1. Get total unread count for customer (always returned for badge/UI count)
        const string unreadCountSql = """
            SELECT COUNT(*) 
            FROM CustomerNotifications 
            WHERE CustomerId = @CustomerId AND IsRead = 0;
            """;
        int unreadCount;
        await using (var unreadCmd = new MySqlCommand(unreadCountSql, connection))
        {
            unreadCmd.Parameters.AddWithValue("@CustomerId", customerId);
            unreadCount = Convert.ToInt32(await unreadCmd.ExecuteScalarAsync(cancellationToken));
        }

        // 2. Total count matching the filter (all or unreadOnly)
        var totalFilterSql = unreadOnly
            ? "SELECT COUNT(*) FROM CustomerNotifications WHERE CustomerId = @CustomerId AND IsRead = 0;"
            : "SELECT COUNT(*) FROM CustomerNotifications WHERE CustomerId = @CustomerId;";

        int totalCount;
        await using (var totalCmd = new MySqlCommand(totalFilterSql, connection))
        {
            totalCmd.Parameters.AddWithValue("@CustomerId", customerId);
            totalCount = Convert.ToInt32(await totalCmd.ExecuteScalarAsync(cancellationToken));
        }

        if (totalCount == 0)
        {
            return (Array.Empty<CustomerNotification>(), 0, unreadCount);
        }

        // 3. Paginated list
        var offset = (page - 1) * pageSize;
        var listSql = $"""
            SELECT Id, CustomerId, EventType, Title, Message, ReferenceType, ReferenceId, ReferenceCode, IsRead, ReadAt, IdempotencyKey, CreatedAt
            FROM CustomerNotifications
            WHERE CustomerId = @CustomerId {(unreadOnly ? "AND IsRead = 0" : "")}
            ORDER BY CreatedAt DESC, Id DESC
            LIMIT @PageSize OFFSET @Offset;
            """;

        var items = new List<CustomerNotification>();
        await using (var listCmd = new MySqlCommand(listSql, connection))
        {
            listCmd.Parameters.AddWithValue("@CustomerId", customerId);
            listCmd.Parameters.AddWithValue("@PageSize", pageSize);
            listCmd.Parameters.AddWithValue("@Offset", offset);

            await using var reader = await listCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(MapNotification(reader));
            }
        }

        return (items, totalCount, unreadCount);
    }

    public async Task<CustomerNotification?> GetByIdAsync(
        int customerId,
        int notificationId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT Id, CustomerId, EventType, Title, Message, ReferenceType, ReferenceId, ReferenceCode, IsRead, ReadAt, IdempotencyKey, CreatedAt
            FROM CustomerNotifications
            WHERE Id = @Id AND CustomerId = @CustomerId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Id", notificationId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapNotification(reader);
        }

        return null;
    }

    public async Task<bool> MarkAsReadAsync(
        int customerId,
        int notificationId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            UPDATE CustomerNotifications
            SET IsRead = 1, ReadAt = CURRENT_TIMESTAMP
            WHERE Id = @Id AND CustomerId = @CustomerId AND IsRead = 0;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Id", notificationId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<int> MarkAllAsReadAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            UPDATE CustomerNotifications
            SET IsRead = 1, ReadAt = CURRENT_TIMESTAMP
            WHERE CustomerId = @CustomerId AND IsRead = 0;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<int> GetUnreadCountAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT COUNT(*)
            FROM CustomerNotifications
            WHERE CustomerId = @CustomerId AND IsRead = 0;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }

    private static CustomerNotification MapNotification(MySqlDataReader reader)
    {
        var idOrdinal = reader.GetOrdinal("Id");
        var custIdOrdinal = reader.GetOrdinal("CustomerId");
        var eventTypeOrdinal = reader.GetOrdinal("EventType");
        var titleOrdinal = reader.GetOrdinal("Title");
        var msgOrdinal = reader.GetOrdinal("Message");
        var refTypeOrdinal = reader.GetOrdinal("ReferenceType");
        var refIdOrdinal = reader.GetOrdinal("ReferenceId");
        var refCodeOrdinal = reader.GetOrdinal("ReferenceCode");
        var isReadOrdinal = reader.GetOrdinal("IsRead");
        var readAtOrdinal = reader.GetOrdinal("ReadAt");
        var idempOrdinal = reader.GetOrdinal("IdempotencyKey");
        var createdAtOrdinal = reader.GetOrdinal("CreatedAt");

        return new CustomerNotification
        {
            Id = reader.GetInt32(idOrdinal),
            CustomerId = reader.GetInt32(custIdOrdinal),
            EventType = reader.GetString(eventTypeOrdinal),
            Title = reader.GetString(titleOrdinal),
            Message = reader.GetString(msgOrdinal),
            ReferenceType = reader.IsDBNull(refTypeOrdinal) ? null : reader.GetString(refTypeOrdinal),
            ReferenceId = reader.IsDBNull(refIdOrdinal) ? null : reader.GetInt32(refIdOrdinal),
            ReferenceCode = reader.IsDBNull(refCodeOrdinal) ? null : reader.GetString(refCodeOrdinal),
            IsRead = reader.GetBoolean(isReadOrdinal),
            ReadAt = reader.IsDBNull(readAtOrdinal) ? null : DateTime.SpecifyKind(reader.GetDateTime(readAtOrdinal), DateTimeKind.Utc),
            IdempotencyKey = reader.IsDBNull(idempOrdinal) ? null : reader.GetString(idempOrdinal),
            CreatedAt = DateTime.SpecifyKind(reader.GetDateTime(createdAtOrdinal), DateTimeKind.Utc)
        };
    }
}

