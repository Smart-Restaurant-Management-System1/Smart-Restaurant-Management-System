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
            return BadRequest(new { message = "Invalid pagination values." });
        }

        var offset = (page - 1) * pageSize;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        const string sql = """
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
                (@Status IS NULL OR Status = @Status)
                AND (@Type IS NULL OR OrderType = @Type)
            ORDER BY CreatedAt DESC, OrderId DESC
            LIMIT @PageSize OFFSET @Offset;
            """;

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue(
            "@Status",
            string.IsNullOrWhiteSpace(status) ? DBNull.Value : status);
        command.Parameters.AddWithValue(
            "@Type",
            string.IsNullOrWhiteSpace(type) ? DBNull.Value : type);
        command.Parameters.AddWithValue("@PageSize", pageSize);
        command.Parameters.AddWithValue("@Offset", offset);

        var orders = new List<object>();

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var rawStatus = reader.GetString(reader.GetOrdinal("Status"));

            orders.Add(new
            {
                orderId = reader.GetInt32(reader.GetOrdinal("OrderId")),
                orderReference = reader.GetString(reader.GetOrdinal("OrderReference")),
                orderType = reader.GetString(reader.GetOrdinal("OrderType")),
                tableId = reader.IsDBNull(reader.GetOrdinal("TableId"))
                    ? (int?)null
                    : reader.GetInt32(reader.GetOrdinal("TableId")),
                reservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId"))
                    ? (int?)null
                    : reader.GetInt32(reader.GetOrdinal("ReservationId")),
                status = NormalizeStatus(rawStatus),
                originalStatus = rawStatus,
                totalAmount = reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                createdAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                updatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt"))
            });
        }

        return Ok(new
        {
            page,
            pageSize,
            count = orders.Count,
            orders
        });
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
}


