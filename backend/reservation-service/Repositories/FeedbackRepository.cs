using System.Data;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Repositories;

public sealed class FeedbackRepository : IFeedbackRepository
{
    private readonly DatabaseHelper _databaseHelper;

    public FeedbackRepository(DatabaseHelper databaseHelper)
    {
        _databaseHelper = databaseHelper;
    }

    public async Task<int> CreateAsync(CustomerFeedback feedback, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            INSERT INTO CustomerFeedbacks (CustomerId, ReservationId, OrderId, OrderType, Rating, Comment, IsRead, CreatedAt, UpdatedAt)
            VALUES (@CustomerId, @ReservationId, @OrderId, @OrderType, @Rating, @Comment, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            SELECT LAST_INSERT_ID();
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", feedback.CustomerId);
        cmd.Parameters.AddWithValue("@ReservationId", (object?)feedback.ReservationId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@OrderId", (object?)feedback.OrderId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@OrderType", (object?)feedback.OrderType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Rating", feedback.Rating);
        cmd.Parameters.AddWithValue("@Comment", (object?)feedback.Comment ?? DBNull.Value);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }

    public async Task<CustomerFeedback?> GetByIdAsync(int feedbackId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT FeedbackId, CustomerId, ReservationId, OrderId, OrderType, Rating, Comment, IsRead, AdminReply, AdminRepliedAt, AdminRepliedBy, CreatedAt, UpdatedAt
            FROM CustomerFeedbacks
            WHERE FeedbackId = @FeedbackId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new CustomerFeedback
        {
            FeedbackId = reader.GetInt32("FeedbackId"),
            CustomerId = reader.GetInt32("CustomerId"),
            ReservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId")) ? null : reader.GetInt32("ReservationId"),
            OrderId = reader.IsDBNull(reader.GetOrdinal("OrderId")) ? null : reader.GetInt32("OrderId"),
            OrderType = reader.IsDBNull(reader.GetOrdinal("OrderType")) ? null : reader.GetString("OrderType"),
            Rating = reader.GetInt32("Rating"),
            Comment = reader.IsDBNull(reader.GetOrdinal("Comment")) ? null : reader.GetString("Comment"),
            IsRead = !reader.IsDBNull(reader.GetOrdinal("IsRead")) && reader.GetBoolean("IsRead"),
            AdminReply = reader.IsDBNull(reader.GetOrdinal("AdminReply")) ? null : reader.GetString("AdminReply"),
            AdminRepliedAt = reader.IsDBNull(reader.GetOrdinal("AdminRepliedAt")) ? null : reader.GetDateTime("AdminRepliedAt"),
            AdminRepliedBy = reader.IsDBNull(reader.GetOrdinal("AdminRepliedBy")) ? null : reader.GetInt32("AdminRepliedBy"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };
    }

    public async Task<FeedbackResponse?> GetResponseByIdAsync(int feedbackId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT
                f.FeedbackId,
                f.CustomerId,
                CONCAT('Customer #', f.CustomerId) AS CustomerDisplayName,
                f.ReservationId,
                r.BookingReference,
                f.OrderId,
                CASE
                    WHEN f.OrderType = 'DineIn' THEN CONCAT('DIN-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderType = 'ReservationPreOrder' THEN CONCAT('PRE-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderId IS NOT NULL THEN CONCAT('ORD-', LPAD(f.OrderId, 6, '0'))
                    ELSE NULL
                END AS OrderReference,
                f.OrderType,
                f.Rating,
                f.Comment,
                f.IsRead,
                f.AdminReply,
                f.AdminRepliedAt,
                f.CreatedAt
            FROM CustomerFeedbacks f
            LEFT JOIN Reservations r ON f.ReservationId = r.Id
            WHERE f.FeedbackId = @FeedbackId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new FeedbackResponse
        {
            FeedbackId = reader.GetInt32("FeedbackId"),
            CustomerId = reader.GetInt32("CustomerId"),
            CustomerDisplayName = reader.GetString("CustomerDisplayName"),
            ReservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId")) ? null : reader.GetInt32("ReservationId"),
            BookingReference = reader.IsDBNull(reader.GetOrdinal("BookingReference")) ? null : reader.GetString("BookingReference"),
            OrderId = reader.IsDBNull(reader.GetOrdinal("OrderId")) ? null : reader.GetInt32("OrderId"),
            OrderReference = reader.IsDBNull(reader.GetOrdinal("OrderReference")) ? null : reader.GetString("OrderReference"),
            OrderType = reader.IsDBNull(reader.GetOrdinal("OrderType")) ? null : reader.GetString("OrderType"),
            Rating = reader.GetInt32("Rating"),
            Comment = reader.IsDBNull(reader.GetOrdinal("Comment")) ? null : reader.GetString("Comment"),
            IsRead = !reader.IsDBNull(reader.GetOrdinal("IsRead")) && reader.GetBoolean("IsRead"),
            AdminReply = reader.IsDBNull(reader.GetOrdinal("AdminReply")) ? null : reader.GetString("AdminReply"),
            AdminRepliedAt = reader.IsDBNull(reader.GetOrdinal("AdminRepliedAt")) ? null : reader.GetDateTime("AdminRepliedAt"),
            CreatedAt = reader.GetDateTime("CreatedAt")
        };
    }

    public async Task<IReadOnlyList<FeedbackResponse>> GetForCustomerAsync(int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT
                f.FeedbackId,
                f.CustomerId,
                CONCAT('Customer #', f.CustomerId) AS CustomerDisplayName,
                f.ReservationId,
                r.BookingReference,
                f.OrderId,
                CASE
                    WHEN f.OrderType = 'DineIn' THEN CONCAT('DIN-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderType = 'ReservationPreOrder' THEN CONCAT('PRE-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderId IS NOT NULL THEN CONCAT('ORD-', LPAD(f.OrderId, 6, '0'))
                    ELSE NULL
                END AS OrderReference,
                f.OrderType,
                f.Rating,
                f.Comment,
                f.IsRead,
                f.AdminReply,
                f.AdminRepliedAt,
                f.CreatedAt
            FROM CustomerFeedbacks f
            LEFT JOIN Reservations r ON f.ReservationId = r.Id
            WHERE f.CustomerId = @CustomerId
            ORDER BY f.CreatedAt DESC, f.FeedbackId DESC;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var list = new List<FeedbackResponse>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new FeedbackResponse
            {
                FeedbackId = reader.GetInt32("FeedbackId"),
                CustomerId = reader.GetInt32("CustomerId"),
                CustomerDisplayName = reader.GetString("CustomerDisplayName"),
                ReservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId")) ? null : reader.GetInt32("ReservationId"),
                BookingReference = reader.IsDBNull(reader.GetOrdinal("BookingReference")) ? null : reader.GetString("BookingReference"),
                OrderId = reader.IsDBNull(reader.GetOrdinal("OrderId")) ? null : reader.GetInt32("OrderId"),
                OrderReference = reader.IsDBNull(reader.GetOrdinal("OrderReference")) ? null : reader.GetString("OrderReference"),
                OrderType = reader.IsDBNull(reader.GetOrdinal("OrderType")) ? null : reader.GetString("OrderType"),
                Rating = reader.GetInt32("Rating"),
                Comment = reader.IsDBNull(reader.GetOrdinal("Comment")) ? null : reader.GetString("Comment"),
                IsRead = !reader.IsDBNull(reader.GetOrdinal("IsRead")) && reader.GetBoolean("IsRead"),
                AdminReply = reader.IsDBNull(reader.GetOrdinal("AdminReply")) ? null : reader.GetString("AdminReply"),
                AdminRepliedAt = reader.IsDBNull(reader.GetOrdinal("AdminRepliedAt")) ? null : reader.GetDateTime("AdminRepliedAt"),
                CreatedAt = reader.GetDateTime("CreatedAt")
            });
        }

        return list;
    }

    public async Task<FeedbackPagedResult<FeedbackResponse>> GetForAdminAsync(AdminFeedbackQuery query, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var whereClauses = new List<string>();
        if (query.Rating.HasValue && query.Rating.Value >= 1 && query.Rating.Value <= 5)
        {
            whereClauses.Add("f.Rating = @Rating");
        }
        if (query.IsRead.HasValue)
        {
            whereClauses.Add("f.IsRead = @IsRead");
        }
        if (query.FromDate.HasValue)
        {
            whereClauses.Add("f.CreatedAt >= @FromDate");
        }
        if (query.ToDate.HasValue)
        {
            whereClauses.Add("f.CreatedAt <= @ToDate");
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            whereClauses.Add("(f.Comment LIKE CONCAT('%', @Search, '%') OR r.BookingReference LIKE CONCAT('%', @Search, '%') OR f.AdminReply LIKE CONCAT('%', @Search, '%'))");
        }

        var whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : string.Empty;

        // 1. Get total count
        var countSql = $"""
            SELECT COUNT(*)
            FROM CustomerFeedbacks f
            LEFT JOIN Reservations r ON f.ReservationId = r.Id
            {whereSql};
            """;

        await using var countCmd = new MySqlCommand(countSql, connection);
        BindFilterParams(countCmd, query);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken));

        // 2. Get paged items
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var itemsSql = $"""
            SELECT
                f.FeedbackId,
                f.CustomerId,
                CONCAT('Customer #', f.CustomerId) AS CustomerDisplayName,
                f.ReservationId,
                r.BookingReference,
                f.OrderId,
                CASE
                    WHEN f.OrderType = 'DineIn' THEN CONCAT('DIN-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderType = 'ReservationPreOrder' THEN CONCAT('PRE-', LPAD(f.OrderId, 6, '0'))
                    WHEN f.OrderId IS NOT NULL THEN CONCAT('ORD-', LPAD(f.OrderId, 6, '0'))
                    ELSE NULL
                END AS OrderReference,
                f.OrderType,
                f.Rating,
                f.Comment,
                f.IsRead,
                f.AdminReply,
                f.AdminRepliedAt,
                f.CreatedAt
            FROM CustomerFeedbacks f
            LEFT JOIN Reservations r ON f.ReservationId = r.Id
            {whereSql}
            ORDER BY f.CreatedAt DESC, f.FeedbackId DESC
            LIMIT @PageSize OFFSET @Offset;
            """;

        await using var itemsCmd = new MySqlCommand(itemsSql, connection);
        BindFilterParams(itemsCmd, query);
        itemsCmd.Parameters.AddWithValue("@PageSize", pageSize);
        itemsCmd.Parameters.AddWithValue("@Offset", offset);

        var items = new List<FeedbackResponse>();
        await using var reader = await itemsCmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new FeedbackResponse
            {
                FeedbackId = reader.GetInt32("FeedbackId"),
                CustomerId = reader.GetInt32("CustomerId"),
                CustomerDisplayName = reader.GetString("CustomerDisplayName"),
                ReservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId")) ? null : reader.GetInt32("ReservationId"),
                BookingReference = reader.IsDBNull(reader.GetOrdinal("BookingReference")) ? null : reader.GetString("BookingReference"),
                OrderId = reader.IsDBNull(reader.GetOrdinal("OrderId")) ? null : reader.GetInt32("OrderId"),
                OrderReference = reader.IsDBNull(reader.GetOrdinal("OrderReference")) ? null : reader.GetString("OrderReference"),
                OrderType = reader.IsDBNull(reader.GetOrdinal("OrderType")) ? null : reader.GetString("OrderType"),
                Rating = reader.GetInt32("Rating"),
                Comment = reader.IsDBNull(reader.GetOrdinal("Comment")) ? null : reader.GetString("Comment"),
                IsRead = !reader.IsDBNull(reader.GetOrdinal("IsRead")) && reader.GetBoolean("IsRead"),
                AdminReply = reader.IsDBNull(reader.GetOrdinal("AdminReply")) ? null : reader.GetString("AdminReply"),
                AdminRepliedAt = reader.IsDBNull(reader.GetOrdinal("AdminRepliedAt")) ? null : reader.GetDateTime("AdminRepliedAt"),
                CreatedAt = reader.GetDateTime("CreatedAt")
            });
        }

        return new FeedbackPagedResult<FeedbackResponse>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<FeedbackSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        const string statsSql = """
            SELECT 
                COUNT(*) AS TotalCount, 
                COALESCE(AVG(Rating), 0.0) AS AvgRating,
                COUNT(CASE WHEN IsRead = 0 THEN 1 END) AS UnreadCount
            FROM CustomerFeedbacks;
            """;
        await using var statsCmd = new MySqlCommand(statsSql, connection);
        await using var statsReader = await statsCmd.ExecuteReaderAsync(cancellationToken);

        var totalCount = 0;
        var avgRating = 0.0;
        var unreadCount = 0;
        if (await statsReader.ReadAsync(cancellationToken))
        {
            totalCount = statsReader.GetInt32("TotalCount");
            avgRating = Math.Round(statsReader.GetDouble("AvgRating"), 1);
            unreadCount = statsReader.GetInt32("UnreadCount");
        }
        await statsReader.CloseAsync();

        const string distSql = """
            SELECT Rating, COUNT(*) AS Count
            FROM CustomerFeedbacks
            GROUP BY Rating;
            """;
        await using var distCmd = new MySqlCommand(distSql, connection);
        await using var distReader = await distCmd.ExecuteReaderAsync(cancellationToken);

        var distribution = new Dictionary<int, int>
        {
            [1] = 0,
            [2] = 0,
            [3] = 0,
            [4] = 0,
            [5] = 0
        };

        while (await distReader.ReadAsync(cancellationToken))
        {
            var rating = distReader.GetInt32("Rating");
            var count = distReader.GetInt32("Count");
            distribution[rating] = count;
        }

        return new FeedbackSummaryResponse
        {
            TotalFeedbacks = totalCount,
            AverageRating = avgRating,
            UnreadCount = unreadCount,
            RatingDistribution = distribution
        };
    }

    public async Task<bool> UpdateAsync(int feedbackId, int customerId, int rating, string? comment, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            UPDATE CustomerFeedbacks
            SET Rating = @Rating, Comment = @Comment, UpdatedAt = CURRENT_TIMESTAMP
            WHERE FeedbackId = @FeedbackId AND CustomerId = @CustomerId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);
        cmd.Parameters.AddWithValue("@Rating", rating);
        cmd.Parameters.AddWithValue("@Comment", (object?)comment ?? DBNull.Value);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteForCustomerAsync(int feedbackId, int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            DELETE FROM CustomerFeedbacks
            WHERE FeedbackId = @FeedbackId AND CustomerId = @CustomerId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteForAdminAsync(int feedbackId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            DELETE FROM CustomerFeedbacks
            WHERE FeedbackId = @FeedbackId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> MarkAsReadAsync(int feedbackId, bool isRead, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            UPDATE CustomerFeedbacks
            SET IsRead = @IsRead, UpdatedAt = CURRENT_TIMESTAMP
            WHERE FeedbackId = @FeedbackId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);
        cmd.Parameters.AddWithValue("@IsRead", isRead);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> SetAdminReplyAsync(int feedbackId, string reply, int adminUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            UPDATE CustomerFeedbacks
            SET AdminReply = @AdminReply, AdminRepliedAt = CURRENT_TIMESTAMP, AdminRepliedBy = @AdminUserId, IsRead = 1, UpdatedAt = CURRENT_TIMESTAMP
            WHERE FeedbackId = @FeedbackId;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FeedbackId", feedbackId);
        cmd.Parameters.AddWithValue("@AdminReply", reply);
        cmd.Parameters.AddWithValue("@AdminUserId", adminUserId);

        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> HasFeedbackForReservationAsync(int customerId, int reservationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT 1 FROM CustomerFeedbacks
            WHERE CustomerId = @CustomerId AND ReservationId = @ReservationId
            LIMIT 1;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);
        cmd.Parameters.AddWithValue("@ReservationId", reservationId);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    public async Task<bool> HasFeedbackForOrderAsync(int customerId, int orderId, string? orderType, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT 1 FROM CustomerFeedbacks
            WHERE CustomerId = @CustomerId AND OrderId = @OrderId AND (@OrderType IS NULL OR OrderType = @OrderType)
            LIMIT 1;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);
        cmd.Parameters.AddWithValue("@OrderId", orderId);
        cmd.Parameters.AddWithValue("@OrderType", (object?)orderType ?? DBNull.Value);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    public async Task<bool> ValidateReservationOwnershipAsync(int reservationId, int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = """
            SELECT 1 FROM Reservations
            WHERE Id = @ReservationId AND CustomerId = @CustomerId
            LIMIT 1;
            """;

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@ReservationId", reservationId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    public async Task<bool> ValidateOrderOwnershipAsync(int orderId, string? orderType, int customerId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        string sql;
        if (string.Equals(orderType, "DineIn", StringComparison.OrdinalIgnoreCase))
        {
            sql = "SELECT 1 FROM DineInOrders WHERE OrderId = @OrderId AND CustomerId = @CustomerId LIMIT 1;";
        }
        else if (string.Equals(orderType, "ReservationPreOrder", StringComparison.OrdinalIgnoreCase))
        {
            sql = "SELECT 1 FROM ReservationPreOrders WHERE OrderId = @OrderId AND CustomerId = @CustomerId LIMIT 1;";
        }
        else
        {
            sql = """
                SELECT 1 FROM (
                    SELECT OrderId, CustomerId FROM DineInOrders
                    UNION ALL
                    SELECT OrderId, CustomerId FROM ReservationPreOrders
                ) o
                WHERE o.OrderId = @OrderId AND o.CustomerId = @CustomerId
                LIMIT 1;
                """;
        }

        await using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@OrderId", orderId);
        cmd.Parameters.AddWithValue("@CustomerId", customerId);

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    private static void BindFilterParams(MySqlCommand cmd, AdminFeedbackQuery query)
    {
        if (query.Rating.HasValue && query.Rating.Value >= 1 && query.Rating.Value <= 5)
        {
            cmd.Parameters.AddWithValue("@Rating", query.Rating.Value);
        }
        if (query.IsRead.HasValue)
        {
            cmd.Parameters.AddWithValue("@IsRead", query.IsRead.Value);
        }
        if (query.FromDate.HasValue)
        {
            cmd.Parameters.AddWithValue("@FromDate", query.FromDate.Value);
        }
        if (query.ToDate.HasValue)
        {
            cmd.Parameters.AddWithValue("@ToDate", query.ToDate.Value);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            cmd.Parameters.AddWithValue("@Search", query.Search.Trim());
        }
    }
}

