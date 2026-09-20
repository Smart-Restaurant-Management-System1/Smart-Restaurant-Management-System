using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/kitchen")]
[Authorize(Policy = AppPolicies.RequireStaff)]
public sealed class KitchenQueueController : ControllerBase
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly ILogger<KitchenQueueController> _logger;
    private readonly IOutboxRepository _outboxRepository;

    public KitchenQueueController(
        DatabaseHelper databaseHelper,
        ILogger<KitchenQueueController> logger,
        IOutboxRepository outboxRepository)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;
        _outboxRepository = outboxRepository;
    }

    [HttpGet("queue")]
    [ProducesResponseType(
        typeof(KitchenQueueResponseDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetKitchenQueue(
        CancellationToken cancellationToken)
    {
        try
        {
            await using var connection =
                await _databaseHelper.CreateConnectionAsync(
                    cancellationToken);

            const string orderSql = """
                SELECT
                    d.OrderId,
                    CONCAT('DIN-', LPAD(d.OrderId, 6, '0')) AS OrderReference,
                    'DineIn' AS OrderType,
                    CASE
                        WHEN d.Status = 'Received' THEN 'Pending'
                        ELSE d.Status
                    END AS Status,
                    d.CreatedAt AS SubmittedAt,
                    d.TableId,
                    NULL AS ReservationId,
                    d.TotalAmount
                FROM DineInOrders d
                WHERE d.Status IN ('Received', 'Preparing', 'Ready')

                UNION ALL

                SELECT
                    p.OrderId,
                    CONCAT('PRE-', LPAD(p.OrderId, 6, '0')) AS OrderReference,
                    'ReservationPreOrder' AS OrderType,
                    p.Status,
                    p.CreatedAt AS SubmittedAt,
                    r.TableId,
                    p.ReservationId,
                    p.TotalAmount
                FROM ReservationPreOrders p
                INNER JOIN Reservations r
                    ON r.Id = p.ReservationId
                WHERE p.Status IN ('Pending', 'Preparing', 'Ready')

                ORDER BY
                    CASE Status
                        WHEN 'Pending' THEN 1
                        WHEN 'Preparing' THEN 2
                        WHEN 'Ready' THEN 3
                        ELSE 4
                    END,
                    SubmittedAt ASC,
                    OrderId ASC;
                """;

            var orders = new List<KitchenQueueOrderDto>();

            await using (var command =
                new MySqlCommand(orderSql, connection))
            {
                await using var reader =
                    await command.ExecuteReaderAsync(
                        cancellationToken);

                while (await reader.ReadAsync(cancellationToken))
                {
                    orders.Add(new KitchenQueueOrderDto
                    {
                        OrderReference = reader.GetString(
                            reader.GetOrdinal("OrderReference")),

                        OrderType = reader.GetString(
                            reader.GetOrdinal("OrderType")),

                        Status = reader.GetString(
                            reader.GetOrdinal("Status")),

                        SubmittedAt = reader.GetDateTime(
                            reader.GetOrdinal("SubmittedAt")),

                        TableId = reader.IsDBNull(
                            reader.GetOrdinal("TableId"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("TableId")),

                        ReservationId = reader.IsDBNull(
                            reader.GetOrdinal("ReservationId"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("ReservationId")),

                        TotalAmount = reader.GetDecimal(
                            reader.GetOrdinal("TotalAmount"))
                    });
                }
            }

            foreach (var order in orders)
            {
                order.Items.AddRange(
                    await GetOrderItemsAsync(
                        connection,
                        order,
                        cancellationToken));
            }

            var response = new KitchenQueueResponseDto
            {
                RetrievedAt = DateTime.UtcNow,
                Count = orders.Count,
                Orders = orders
            };

            return Ok(response);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unable to retrieve the kitchen order queue.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message =
                        "Unable to retrieve the kitchen queue. Please try again later."
                });
        }
    }

    [HttpPatch("orders/{orderReference}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateOrderStatus(
        string orderReference,
        [FromBody] UpdateKitchenOrderStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request is null ||
            string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new
            {
                message = "A target status is required."
            });
        }

        orderReference = orderReference.Trim();

        var targetStatus = request.Status.Trim();

        if (targetStatus is not ("Preparing" or "Ready" or "Served" or "Cancelled"))
        {
            return BadRequest(new
            {
                message =
                    "The target status must be Preparing, Ready, Served, or Cancelled."
            });
        }

        var isDineIn = orderReference.StartsWith(
            "DIN-",
            StringComparison.OrdinalIgnoreCase);

        var isPreOrder = orderReference.StartsWith(
            "PRE-",
            StringComparison.OrdinalIgnoreCase);

        if (!isDineIn && !isPreOrder)
        {
            return BadRequest(new
            {
                message = "The order reference is invalid."
            });
        }

        if (!int.TryParse(
                orderReference[4..],
                out var orderId) ||
            orderId <= 0)
        {
            return BadRequest(new
            {
                message = "The order reference is invalid."
            });
        }

        try
        {
            await using var connection =
                await _databaseHelper.CreateConnectionAsync(
                    cancellationToken);

            await using var transaction =
                await connection.BeginTransactionAsync(
                    cancellationToken);

            var tableName = isDineIn
                ? "DineInOrders"
                : "ReservationPreOrders";

            var selectSql = isDineIn
                ? $"""
                    SELECT Status, TableId
                    FROM {tableName}
                    WHERE OrderId = @OrderId
                    FOR UPDATE;
                    """
                : $"""
                    SELECT Status, ReservationId
                    FROM {tableName}
                    WHERE OrderId = @OrderId
                    FOR UPDATE;
                    """;

            string? currentStatus;
            int? tableId = null;
            int? reservationId = null;

            await using (var selectCommand = new MySqlCommand(
                selectSql,
                connection,
                transaction))
            {
                selectCommand.Parameters.AddWithValue(
                    "@OrderId",
                    orderId);

                await using var reader =
                    await selectCommand.ExecuteReaderAsync(
                        cancellationToken);

                if (await reader.ReadAsync(cancellationToken))
                {
                    currentStatus = reader.IsDBNull(0)
                        ? null
                        : reader.GetString(0);

                    if (isDineIn)
                    {
                        tableId = reader.IsDBNull(1)
                            ? null
                            : reader.GetInt32(1);
                    }
                    else
                    {
                        reservationId = reader.IsDBNull(1)
                            ? null
                            : reader.GetInt32(1);
                    }
                }
                else
                {
                    currentStatus = null;
                }
            }

            if (currentStatus is null)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return NotFound(new
                {
                    message = "The order was not found."
                });
            }

            var normalizedCurrentStatus =
                isDineIn && currentStatus == "Received"
                    ? "Pending"
                    : currentStatus;

            var isValidTransition =
                (normalizedCurrentStatus == "Pending" &&
                 targetStatus == "Preparing") ||
                (normalizedCurrentStatus == "Preparing" &&
                 targetStatus == "Ready") ||
                (normalizedCurrentStatus == "Ready" &&
                 targetStatus == "Served") ||
                (normalizedCurrentStatus is "Pending" or "Preparing" or "Ready" &&
                 targetStatus == "Cancelled");

            if (!isValidTransition)
            {
                await transaction.RollbackAsync(
                    cancellationToken);

                return Conflict(new
                {
                    message =
                        $"The order cannot move from {normalizedCurrentStatus} to {targetStatus}."
                });
            }

            var updateSql = $"""
                UPDATE {tableName}
                SET Status = @TargetStatus,
                    UpdatedAt = CURRENT_TIMESTAMP
                WHERE OrderId = @OrderId
                  AND Status = @CurrentStatus;
                """;

            await using (var updateCommand = new MySqlCommand(
                updateSql,
                connection,
                transaction))
            {
                updateCommand.Parameters.AddWithValue(
                    "@TargetStatus",
                    targetStatus);

                updateCommand.Parameters.AddWithValue(
                    "@CurrentStatus",
                    currentStatus);

                updateCommand.Parameters.AddWithValue(
                    "@OrderId",
                    orderId);

                var affectedRows =
                    await updateCommand.ExecuteNonQueryAsync(
                        cancellationToken);

                if (affectedRows != 1)
                {
                    await transaction.RollbackAsync(
                        cancellationToken);

                    return Conflict(new
                    {
                        message =
                            "The order was changed by another request. Refresh the queue and try again."
                    });
                }
            }

            var lifecycleEventType = targetStatus switch
            {
                "Preparing" => OrderLifecycleEventTypes.OrderPreparing,
                "Ready" => OrderLifecycleEventTypes.OrderReady,
                "Served" => OrderLifecycleEventTypes.OrderServed,
                "Cancelled" => OrderLifecycleEventTypes.OrderCancelled,
                _ => throw new InvalidOperationException(
                    $"Unsupported order lifecycle target status: {targetStatus}.")
            };

            await OrderLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                lifecycleEventType,
                orderId,
                orderReference,
                isDineIn ? "DineIn" : "PreOrder",
                targetStatus,
                tableId,
                reservationId,
                normalizedCurrentStatus,
                null,
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            return Ok(new
            {
                orderReference,
                previousStatus = normalizedCurrentStatus,
                status = targetStatus,
                updatedAt = DateTime.UtcNow
            });
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unable to update kitchen order status for {OrderReference}.",
                orderReference);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message =
                        "Unable to update the order status. Please try again later."
                });
        }
    }

    private static async Task<List<KitchenQueueItemDto>>
        GetOrderItemsAsync(
            MySqlConnection connection,
            KitchenQueueOrderDto order,
            CancellationToken cancellationToken)
    {
        var items = new List<KitchenQueueItemDto>();

        var sql = order.OrderType == "DineIn"
            ? """
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
                INNER JOIN DineInOrders d
                    ON d.OrderId = i.OrderId
                WHERE i.OrderId = (
                    SELECT OrderId
                    FROM DineInOrders
                    WHERE CONCAT('DIN-', LPAD(OrderId, 6, '0'))
                        = @OrderReference
                )
                ORDER BY i.OrderItemId;
                """
            : """
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
                INNER JOIN ReservationPreOrders p
                    ON p.OrderId = i.OrderId
                WHERE i.OrderId = (
                    SELECT OrderId
                    FROM ReservationPreOrders
                    WHERE CONCAT('PRE-', LPAD(OrderId, 6, '0'))
                        = @OrderReference
                )
                ORDER BY i.OrderItemId;
                """;

        await using var command =
            new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@OrderReference",
            order.OrderReference);

        await using var reader =
            await command.ExecuteReaderAsync(
                cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new KitchenQueueItemDto
            {
                OrderItemId = reader.GetInt32(
                    reader.GetOrdinal("OrderItemId")),

                MenuItemId = reader.GetInt32(
                    reader.GetOrdinal("MenuItemId")),

                ItemName = reader.GetString(
                    reader.GetOrdinal("ItemName")),

                Quantity = reader.GetInt32(
                    reader.GetOrdinal("Quantity")),

                UnitPrice = reader.GetDecimal(
                    reader.GetOrdinal("UnitPrice")),

                Subtotal = reader.GetDecimal(
                    reader.GetOrdinal("Subtotal"))
            });
        }

        return items;
    }
}
