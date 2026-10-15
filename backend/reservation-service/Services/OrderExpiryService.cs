using MySqlConnector;
using ReservationService.Data;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class OrderExpiryService : IOrderExpiryService
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly IOutboxRepository _outboxRepository;
    private readonly ILogger<OrderExpiryService> _logger;

    public OrderExpiryService(
        DatabaseHelper databaseHelper,
        IOutboxRepository outboxRepository,
        ILogger<OrderExpiryService> logger)
    {
        _databaseHelper = databaseHelper;
        _outboxRepository = outboxRepository;
        _logger = logger;
    }

    public async Task<OrderExpiryResult> ExpireUnpaidOrdersAsync(
        int thresholdMinutes,
        CancellationToken cancellationToken = default)
    {
        if (thresholdMinutes <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(thresholdMinutes),
                "Threshold minutes must be a positive integer.");
        }

        var result = new OrderExpiryResult();
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await ProcessExpiredDineInOrdersAsync(connection, thresholdMinutes, result, cancellationToken);
        await ProcessExpiredPreOrdersAsync(connection, thresholdMinutes, result, cancellationToken);

        return result;
    }

    private async Task ProcessExpiredDineInOrdersAsync(
        MySqlConnection connection,
        int thresholdMinutes,
        OrderExpiryResult result,
        CancellationToken cancellationToken)
    {
        const string selectSql = """
            SELECT d.OrderId, d.TableId, d.CreatedAt
            FROM DineInOrders d
            WHERE d.Status = 'Received'
              AND d.CreatedAt < DATE_SUB(NOW(), INTERVAL @ThresholdMinutes MINUTE)
              AND NOT EXISTS (
                  SELECT 1 FROM Payments p
                  WHERE p.OrderType = 'DineIn'
                    AND p.OrderId = d.OrderId
                    AND p.Status = 'Succeeded'
              );
            """;

        var candidates = new List<(int OrderId, int? TableId)>();

        await using (var command = new MySqlCommand(selectSql, connection))
        {
            command.Parameters.AddWithValue("@ThresholdMinutes", thresholdMinutes);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var orderId = reader.GetInt32("OrderId");
                int? tableId = reader.IsDBNull(reader.GetOrdinal("TableId"))
                    ? null
                    : reader.GetInt32("TableId");
                candidates.Add((orderId, tableId));
            }
        }

        foreach (var (orderId, tableId) in candidates)
        {
            if (cancellationToken.IsCancellationRequested) break;

            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                const string updateOrderSql = """
                    UPDATE DineInOrders
                    SET Status = 'Cancelled',
                        UpdatedAt = CURRENT_TIMESTAMP
                    WHERE OrderId = @OrderId
                      AND Status = 'Received';
                    """;

                int affected;
                await using (var updateCmd = new MySqlCommand(updateOrderSql, connection, transaction))
                {
                    updateCmd.Parameters.AddWithValue("@OrderId", orderId);
                    affected = await updateCmd.ExecuteNonQueryAsync(cancellationToken);
                }

                if (affected > 0)
                {
                    const string updatePaymentSql = """
                        UPDATE Payments
                        SET Status = 'Cancelled',
                            UpdatedAt = CURRENT_TIMESTAMP
                        WHERE OrderType = 'DineIn'
                          AND OrderId = @OrderId
                          AND Status = 'Pending';
                        """;

                    await using (var updatePayCmd = new MySqlCommand(updatePaymentSql, connection, transaction))
                    {
                        updatePayCmd.Parameters.AddWithValue("@OrderId", orderId);
                        await updatePayCmd.ExecuteNonQueryAsync(cancellationToken);
                    }

                    var orderRef = $"DIN-{orderId:D6}";

                    await OrderLifecycleOutboxHelper.InsertAsync(
                        connection,
                        transaction,
                        _outboxRepository,
                        OrderLifecycleEventTypes.OrderCancelled,
                        orderId,
                        orderRef,
                        "DineIn",
                        "Cancelled",
                        tableId,
                        null,
                        "Received",
                        "AutoExpiryBackgroundService",
                        cancellationToken);

                    await transaction.CommitAsync(cancellationToken);

                    result.ExpiredDineInOrdersCount++;
                    result.ExpiredOrderReferences.Add(orderRef);

                    _logger.LogInformation(
                        "Auto-expired unpaid Dine-In order {OrderRef} (ID: {OrderId}) after {ThresholdMinutes}m without payment.",
                        orderRef, orderId, thresholdMinutes);
                }
                else
                {
                    await transaction.RollbackAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to auto-expire Dine-In order {OrderId}.", orderId);
            }
        }
    }

    private async Task ProcessExpiredPreOrdersAsync(
        MySqlConnection connection,
        int thresholdMinutes,
        OrderExpiryResult result,
        CancellationToken cancellationToken)
    {
        const string selectSql = """
            SELECT p.OrderId, p.ReservationId, p.CreatedAt
            FROM ReservationPreOrders p
            WHERE p.Status = 'Pending'
              AND p.CreatedAt < DATE_SUB(NOW(), INTERVAL @ThresholdMinutes MINUTE)
              AND NOT EXISTS (
                  SELECT 1 FROM Payments pay
                  WHERE pay.OrderType = 'ReservationPreOrder'
                    AND pay.OrderId = p.OrderId
                    AND pay.Status = 'Succeeded'
              );
            """;

        var candidates = new List<(int OrderId, int? ReservationId)>();

        await using (var command = new MySqlCommand(selectSql, connection))
        {
            command.Parameters.AddWithValue("@ThresholdMinutes", thresholdMinutes);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var orderId = reader.GetInt32("OrderId");
                int? reservationId = reader.IsDBNull(reader.GetOrdinal("ReservationId"))
                    ? null
                    : reader.GetInt32("ReservationId");
                candidates.Add((orderId, reservationId));
            }
        }

        foreach (var (orderId, reservationId) in candidates)
        {
            if (cancellationToken.IsCancellationRequested) break;

            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                const string updateOrderSql = """
                    UPDATE ReservationPreOrders
                    SET Status = 'Cancelled',
                        UpdatedAt = CURRENT_TIMESTAMP
                    WHERE OrderId = @OrderId
                      AND Status = 'Pending';
                    """;

                int affected;
                await using (var updateCmd = new MySqlCommand(updateOrderSql, connection, transaction))
                {
                    updateCmd.Parameters.AddWithValue("@OrderId", orderId);
                    affected = await updateCmd.ExecuteNonQueryAsync(cancellationToken);
                }

                if (affected > 0)
                {
                    const string updatePaymentSql = """
                        UPDATE Payments
                        SET Status = 'Cancelled',
                            UpdatedAt = CURRENT_TIMESTAMP
                        WHERE OrderType = 'ReservationPreOrder'
                          AND OrderId = @OrderId
                          AND Status = 'Pending';
                        """;

                    await using (var updatePayCmd = new MySqlCommand(updatePaymentSql, connection, transaction))
                    {
                        updatePayCmd.Parameters.AddWithValue("@OrderId", orderId);
                        await updatePayCmd.ExecuteNonQueryAsync(cancellationToken);
                    }

                    var orderRef = $"PRE-{orderId:D6}";

                    await OrderLifecycleOutboxHelper.InsertAsync(
                        connection,
                        transaction,
                        _outboxRepository,
                        OrderLifecycleEventTypes.OrderCancelled,
                        orderId,
                        orderRef,
                        "PreOrder",
                        "Cancelled",
                        null,
                        reservationId,
                        "Pending",
                        "AutoExpiryBackgroundService",
                        cancellationToken);

                    await transaction.CommitAsync(cancellationToken);

                    result.ExpiredPreOrdersCount++;
                    result.ExpiredOrderReferences.Add(orderRef);

                    _logger.LogInformation(
                        "Auto-expired unpaid Reservation Pre-Order {OrderRef} (ID: {OrderId}) after {ThresholdMinutes}m without payment.",
                        orderRef, orderId, thresholdMinutes);
                }
                else
                {
                    await transaction.RollbackAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to auto-expire Reservation Pre-Order {OrderId}.", orderId);
            }
        }
    }
}
