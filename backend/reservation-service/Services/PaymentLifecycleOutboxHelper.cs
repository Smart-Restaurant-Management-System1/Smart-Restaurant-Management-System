using System.Text.Json;
using MySqlConnector;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public static class PaymentLifecycleOutboxHelper
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
        Payment payment,
        string eventType,
        CancellationToken cancellationToken)
    {
        var occurredAt = DateTime.UtcNow;

        var paymentEvent = new PaymentLifecycleEvent
        {
            EventId = Guid.NewGuid(),
            EventType = eventType,
            OccurredAtUtc = occurredAt,
            PaymentId = payment.PaymentId,
            CustomerId = payment.CustomerId,
            OrderType = payment.OrderType,
            OrderId = payment.OrderId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            PaymentMethod = payment.PaymentMethod,
            Status = payment.Status,
            MerchantOrderReference = payment.MerchantOrderReference,
            ProviderPaymentId = payment.ProviderPaymentId
        };

        var payload = JsonSerializer.Serialize(paymentEvent, JsonOptions);

        var outboxEvent = new OutboxEvent
        {
            EventId = paymentEvent.EventId,
            EventType = eventType,
            SchemaVersion = 1,
            AggregateType = "Payment",
            AggregateId = payment.PaymentId,
            MessageKey = payment.MerchantOrderReference,
            Payload = payload,
            OccurredAtUtc = occurredAt,
            CreatedAtUtc = occurredAt,
            Status = OutboxEventStatus.Pending
        };

        await outboxRepository.InsertAsync(
            connection,
            transaction,
            outboxEvent,
            cancellationToken);
    }
}
