
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Roles = AppRoles.Customer)]
public sealed class OrderTrackingController : ControllerBase
{
    private readonly DatabaseHelper _databaseHelper;

    public OrderTrackingController(DatabaseHelper databaseHelper)
    {
        _databaseHelper = databaseHelper;
    }

    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        if (!int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var customerId) || customerId <= 0)
        {
            return Unauthorized();
        }

        if (page < 1 || pageSize < 1 || pageSize > 50)
        {
            return BadRequest(new
            {
                message = "Invalid pagination values."
            });
        }

        var offset = (page - 1) * pageSize;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        const string orderSql = """
            SELECT *
            FROM
            (
                SELECT
                    d.OrderId,
                    CONCAT('DIN-', LPAD(d.OrderId, 6, '0')) AS OrderReference,
                    'DineIn' AS OrderType,
                    d.TableId,
                    NULL AS ReservationId,
                    d.Status,
                    d.TotalAmount,
                    d.CreatedAt,
                    d.UpdatedAt
                FROM DineInOrders d
                WHERE d.CustomerId = @CustomerId

                UNION ALL

                SELECT
                    p.OrderId,
                    CONCAT('PRE-', LPAD(p.OrderId, 6, '0')) AS OrderReference,
                    'ReservationPreOrder' AS OrderType,
                    r.TableId,
                    p.ReservationId,
                    p.Status,
                    p.TotalAmount,
                    p.CreatedAt,
                    p.UpdatedAt
                FROM ReservationPreOrders p
                INNER JOIN Reservations r
                    ON r.Id = p.ReservationId
                WHERE p.CustomerId = @CustomerId
            ) orders
            WHERE
                (
                    @Status IS NULL
                    OR Status = @Status
                )
                AND (
                    @Type IS NULL
                    OR OrderType = @Type
                )
            ORDER BY CreatedAt DESC, OrderId DESC
            LIMIT @PageSize OFFSET @Offset;
            """;

        await using var orderCommand =
            new MySqlCommand(orderSql, connection);

        orderCommand.Parameters.AddWithValue(
            "@CustomerId",
            customerId);

        orderCommand.Parameters.AddWithValue(
            "@Status",
            string.IsNullOrWhiteSpace(status)
                ? DBNull.Value
                : status);

        orderCommand.Parameters.AddWithValue(
            "@Type",
            string.IsNullOrWhiteSpace(type)
                ? DBNull.Value
                : type);

        orderCommand.Parameters.AddWithValue(
            "@PageSize",
            pageSize);

        orderCommand.Parameters.AddWithValue(
            "@Offset",
            offset);

        var orders = new List<OrderSummary>();

        await using (var reader =
            await orderCommand.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var rawStatus =
                    reader.GetString(reader.GetOrdinal("Status"));

                orders.Add(new OrderSummary
                {
                    OrderId =
                        reader.GetInt32(
                            reader.GetOrdinal("OrderId")),

                    OrderReference =
                        reader.GetString(
                            reader.GetOrdinal("OrderReference")),

                    OrderType =
                        reader.GetString(
                            reader.GetOrdinal("OrderType")),

                    TableId =
                        reader.IsDBNull(
                            reader.GetOrdinal("TableId"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("TableId")),

                    ReservationId =
                        reader.IsDBNull(
                            reader.GetOrdinal("ReservationId"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("ReservationId")),

                    Status = NormalizeStatus(rawStatus),

                    OriginalStatus = rawStatus,

                    TotalAmount =
                        reader.GetDecimal(
                            reader.GetOrdinal("TotalAmount")),

                    CreatedAt =
                        reader.GetDateTime(
                            reader.GetOrdinal("CreatedAt")),

                    UpdatedAt =
                        reader.GetDateTime(
                            reader.GetOrdinal("UpdatedAt"))
                });
            }
        }

        foreach (var order in orders)
        {
            order.Items = await GetOrderItemsAsync(
                connection,
                order,
                cancellationToken);
        }

        return Ok(new
        {
            page,
            pageSize,
            count = orders.Count,
            orders
        });
    }

    private async Task<List<OrderItem>> GetOrderItemsAsync(
        MySqlConnection connection,
        OrderSummary order,
        CancellationToken cancellationToken)
    {
        var items = new List<OrderItem>();

        string sql;

        if (order.OrderType == "DineIn")
        {
            sql = """
                SELECT
                    i.OrderItemId,
                    i.MenuItemId,
                    m.ItemName,
                    i.Quantity,
                    i.UnitPrice,
                    (i.Quantity * i.UnitPrice) AS Subtotal
                FROM DineInOrderItems i
                INNER JOIN MenuItems m
                    ON m.MenuItemId = i.MenuItemId
                WHERE i.OrderId = @OrderId
                ORDER BY i.OrderItemId;
                """;
        }
        else if (order.OrderType == "ReservationPreOrder")
        {
            sql = """
                SELECT
                    i.OrderItemId,
                    i.MenuItemId,
                    m.ItemName,
                    i.Quantity,
                    i.UnitPrice,
                    (i.Quantity * i.UnitPrice) AS Subtotal
                FROM ReservationPreOrderItems i
                INNER JOIN MenuItems m
                    ON m.MenuItemId = i.MenuItemId
                WHERE i.OrderId = @OrderId
                ORDER BY i.OrderItemId;
                """;
        }
        else
        {
            return items;
        }

        await using var command =
            new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@OrderId",
            order.OrderId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new OrderItem
            {
                OrderItemId =
                    reader.GetInt32(
                        reader.GetOrdinal("OrderItemId")),

                MenuItemId =
                    reader.GetInt32(
                        reader.GetOrdinal("MenuItemId")),

                ItemName =
                    reader.GetString(
                        reader.GetOrdinal("ItemName")),

                Quantity =
                    reader.GetInt32(
                        reader.GetOrdinal("Quantity")),

                UnitPrice =
                    reader.GetDecimal(
                        reader.GetOrdinal("UnitPrice")),

                Subtotal =
                    reader.GetDecimal(
                        reader.GetOrdinal("Subtotal"))
            });
        }

        return items;
    }

    private static string NormalizeStatus(string status)
    {
        return status switch
        {
            "Received" => "Pending",
            "Confirmed" => "Pending",
            "Completed" => "Served",
            _ => status
        };
    }

    private sealed class OrderSummary
    {
        public int OrderId { get; set; }

        public string OrderReference { get; set; } = string.Empty;

        public string OrderType { get; set; } = string.Empty;

        public int? TableId { get; set; }

        public int? ReservationId { get; set; }

        public string Status { get; set; } = string.Empty;

        public string OriginalStatus { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public List<OrderItem> Items { get; set; } = new();
    }

    private sealed class OrderItem
    {
        public int OrderItemId { get; set; }

        public int MenuItemId { get; set; }

        public string ItemName { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal Subtotal { get; set; }
    }
}