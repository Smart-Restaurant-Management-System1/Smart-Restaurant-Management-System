using System.Globalization;
using System.Text.Json;
using MySqlConnector;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public static class OrderLifecycleOutboxHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static async Task InsertAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        IOutboxRepository outboxRepository,
        string eventType,
        int orderId,
        string orderReference,
        string orderType,
        string currentStatus,
        int? tableId,
        int? reservationId,
        string? previousStatus,
        string? correlationId,
        CancellationToken cancellationToken)
    {
        var occurredAt = DateTime.UtcNow;

        var lifecycleEvent = new OrderLifecycleEvent
        {
            EventId = Guid.NewGuid(),
            EventType = eventType,
            EventVersion = 1,
            OccurredAt = occurredAt,
            OrderId = orderId,
            OrderReference = orderReference,
            OrderType = orderType,
            PreviousStatus = previousStatus,
            CurrentStatus = currentStatus,
            TableId = tableId,
            ReservationId = reservationId,
            CorrelationId = correlationId
        };

        var payload = JsonSerializer.Serialize(lifecycleEvent, JsonOptions);

        var outboxEvent = new OutboxEvent
        {
            EventId = lifecycleEvent.EventId,
            EventType = lifecycleEvent.EventType,
            SchemaVersion = lifecycleEvent.EventVersion,
            AggregateType = "Order",
            AggregateId = orderId,
            MessageKey = orderReference,
            Payload = payload,
            OccurredAtUtc = occurredAt,
            CreatedAtUtc = occurredAt
        };

        await outboxRepository.InsertAsync(
            connection,
            transaction,
            outboxEvent,
            cancellationToken);
    }
}
