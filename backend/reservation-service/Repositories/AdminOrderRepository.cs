using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;

namespace ReservationService.Repositories;

/// <summary>
/// Implements administrative querying and filtering across Dine-in and Pre-orders (SR-247, SR-248).
/// </summary>
public sealed class AdminOrderRepository : IAdminOrderRepository
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly string _identityDatabaseName;

    public AdminOrderRepository(DatabaseHelper databaseHelper, IConfiguration configuration)
    {
        _databaseHelper = databaseHelper;

        var rawDbName = configuration["IdentityDb:DatabaseName"]
            ?? configuration["IDENTITY_DB_NAME"]
            ?? "restaurant_identity_db";

        _identityDatabaseName = Regex.Replace(rawDbName, @"[^\w]", "");
        if (string.IsNullOrWhiteSpace(_identityDatabaseName))
        {
            _identityDatabaseName = "restaurant_identity_db";
        }
    }

    public async Task<AdminOrderResponseDto> SearchOrdersAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var (where, parameters) = BuildFilters(query);
        var baseSql = BuildBaseFromSql();

        var countSql = $"SELECT COUNT(*) FROM {baseSql} {where};";
        await using var countCommand = new MySqlCommand(countSql, connection);
        AddParameters(countCommand, parameters);

        var total = Convert.ToInt32(await countCommand.ExecuteScalarAsync(cancellationToken));

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var selectSql = $@"
            SELECT
                orders.OrderId,
                orders.OrderReference,
                orders.OrderType,
                orders.TableId,
                COALESCE(t.TableNumber, '') AS TableNumber,
                orders.ReservationId,
                orders.CustomerId,
                COALESCE(u.FullName, '') AS CustomerName,
                COALESCE(u.Email, '') AS CustomerEmail,
                COALESCE(u.PhoneNumber, '') AS CustomerPhone,
                orders.Status,
                orders.TotalAmount,
                orders.PaymentStatus,
                orders.PaymentMethod,
                orders.CreatedAt,
                orders.UpdatedAt
            FROM {baseSql}
            {where}
            ORDER BY orders.CreatedAt DESC, orders.OrderId DESC
            LIMIT @PageSize OFFSET @Offset;";

        await using var selectCommand = new MySqlCommand(selectSql, connection);
        AddParameters(selectCommand, parameters);
        selectCommand.Parameters.AddWithValue("@PageSize", pageSize);
        selectCommand.Parameters.AddWithValue("@Offset", offset);

        var items = new List<AdminOrderItemDto>();
        await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapOrderItem(reader));
        }

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        return new AdminOrderResponseDto
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            TotalPages = totalPages
        };
    }

    public async Task<IReadOnlyList<AdminOrderItemDto>> GetOrdersForExportAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var (where, parameters) = BuildFilters(query);
        var baseSql = BuildBaseFromSql();

        var selectSql = $@"
            SELECT
                orders.OrderId,
                orders.OrderReference,
                orders.OrderType,
                orders.TableId,
                COALESCE(t.TableNumber, '') AS TableNumber,
                orders.ReservationId,
                orders.CustomerId,
                COALESCE(u.FullName, '') AS CustomerName,
                COALESCE(u.Email, '') AS CustomerEmail,
                COALESCE(u.PhoneNumber, '') AS CustomerPhone,
                orders.Status,
                orders.TotalAmount,
                orders.PaymentStatus,
                orders.PaymentMethod,
                orders.CreatedAt,
                orders.UpdatedAt
            FROM {baseSql}
            {where}
            ORDER BY orders.CreatedAt DESC, orders.OrderId DESC
            LIMIT 10000;";

        await using var selectCommand = new MySqlCommand(selectSql, connection);
        AddParameters(selectCommand, parameters);

        var items = new List<AdminOrderItemDto>();
        await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapOrderItem(reader));
        }

        return items;
    }

    private string BuildBaseFromSql()
    {
        return $@"
            (
                SELECT
                    d.OrderId,
                    CONCAT('DIN-', LPAD(d.OrderId, 6, '0')) AS OrderReference,
                    'DineIn' AS OrderType,
                    d.TableId,
                    NULL AS ReservationId,
                    d.CustomerId,
                    d.Status,
                    d.TotalAmount,
                    d.CreatedAt,
                    d.UpdatedAt,
                    COALESCE((SELECT pay.Status FROM Payments pay WHERE pay.OrderType = 'DineIn' AND pay.OrderId = d.OrderId ORDER BY pay.PaymentId DESC LIMIT 1), 'Unpaid') AS PaymentStatus,
                    (SELECT pay.PaymentMethod FROM Payments pay WHERE pay.OrderType = 'DineIn' AND pay.OrderId = d.OrderId ORDER BY pay.PaymentId DESC LIMIT 1) AS PaymentMethod
                FROM DineInOrders d

                UNION ALL

                SELECT
                    p.OrderId,
                    CONCAT('PRE-', LPAD(p.OrderId, 6, '0')) AS OrderReference,
                    'ReservationPreOrder' AS OrderType,
                    r.TableId,
                    p.ReservationId,
                    p.CustomerId,
                    p.Status,
                    p.TotalAmount,
                    p.CreatedAt,
                    p.UpdatedAt,
                    COALESCE((SELECT pay.Status FROM Payments pay WHERE pay.OrderType = 'ReservationPreOrder' AND pay.OrderId = p.OrderId ORDER BY pay.PaymentId DESC LIMIT 1), 'Unpaid') AS PaymentStatus,
                    (SELECT pay.PaymentMethod FROM Payments pay WHERE pay.OrderType = 'ReservationPreOrder' AND pay.OrderId = p.OrderId ORDER BY pay.PaymentId DESC LIMIT 1) AS PaymentMethod
                FROM ReservationPreOrders p
                INNER JOIN Reservations r ON r.Id = p.ReservationId
            ) AS orders
            LEFT JOIN RestaurantTables t ON t.Id = orders.TableId
            LEFT JOIN `{_identityDatabaseName}`.`Users` u ON u.UserId = orders.CustomerId";
    }

    private static (string Where, Dictionary<string, object> Parameters) BuildFilters(AdminOrderQueryDto query)
    {
        var clauses = new List<string>();
        var parameters = new Dictionary<string, object>();

        if (!string.IsNullOrWhiteSpace(query.OrderReference))
        {
            clauses.Add("orders.OrderReference LIKE @OrderRef");
            parameters["@OrderRef"] = $"%{query.OrderReference.Trim()}%";
        }

        if (!string.IsNullOrWhiteSpace(query.OrderType))
        {
            clauses.Add("orders.OrderType = @OrderType");
            parameters["@OrderType"] = query.OrderType.Trim();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            clauses.Add("orders.Status = @Status");
            parameters["@Status"] = query.Status.Trim();
        }

        if (!string.IsNullOrWhiteSpace(query.TableNumber))
        {
            clauses.Add("t.TableNumber LIKE @TableNum");
            parameters["@TableNum"] = $"%{query.TableNumber.Trim()}%";
        }

        if (query.DateFrom.HasValue)
        {
            clauses.Add("orders.CreatedAt >= @DateFrom");
            parameters["@DateFrom"] = query.DateFrom.Value.ToDateTime(TimeOnly.MinValue);
        }

        if (query.DateTo.HasValue)
        {
            clauses.Add("orders.CreatedAt < @DateToExclusive");
            parameters["@DateToExclusive"] = query.DateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
        }

        if (!string.IsNullOrWhiteSpace(query.Customer))
        {
            clauses.Add("(u.FullName LIKE @Customer OR u.Email LIKE @Customer OR CAST(orders.CustomerId AS CHAR) = @CustomerExact)");
            parameters["@Customer"] = $"%{query.Customer.Trim()}%";
            parameters["@CustomerExact"] = query.Customer.Trim();
        }

        var where = clauses.Count > 0 ? "WHERE " + string.Join(" AND ", clauses) : string.Empty;
        return (where, parameters);
    }

    private static void AddParameters(MySqlCommand command, Dictionary<string, object> parameters)
    {
        foreach (var (key, value) in parameters)
        {
            command.Parameters.AddWithValue(key, value);
        }
    }

    private static AdminOrderItemDto MapOrderItem(MySqlDataReader reader)
    {
        return new AdminOrderItemDto
        {
            OrderId = reader.GetInt32("OrderId"),
            OrderReference = reader.GetString("OrderReference"),
            OrderType = reader.GetString("OrderType"),
            TableId = reader.GetInt32("TableId"),
            TableNumber = reader.IsDBNull(reader.GetOrdinal("TableNumber")) ? string.Empty : reader.GetString("TableNumber"),
            ReservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId")) ? null : reader.GetInt32("ReservationId"),
            CustomerId = reader.GetInt32("CustomerId"),
            CustomerName = reader.IsDBNull(reader.GetOrdinal("CustomerName")) ? string.Empty : reader.GetString("CustomerName"),
            CustomerEmail = reader.IsDBNull(reader.GetOrdinal("CustomerEmail")) ? string.Empty : reader.GetString("CustomerEmail"),
            CustomerPhone = reader.IsDBNull(reader.GetOrdinal("CustomerPhone")) ? string.Empty : reader.GetString("CustomerPhone"),
            Status = reader.GetString("Status"),
            TotalAmount = reader.GetDecimal("TotalAmount"),
            PaymentStatus = reader.IsDBNull(reader.GetOrdinal("PaymentStatus")) ? "Unpaid" : reader.GetString("PaymentStatus"),
            PaymentMethod = reader.IsDBNull(reader.GetOrdinal("PaymentMethod")) ? null : reader.GetString("PaymentMethod"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };
    }
}

