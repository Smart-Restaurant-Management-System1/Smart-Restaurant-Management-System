using System.Globalization;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

/// <summary>
/// SR-112: Hosted background service that reads the ReservationOutbox and publishes to Kafka.
///
/// Delivery guarantee: at-least-once.
/// If Kafka acknowledges publication but the process crashes before MarkProcessedAsync completes,
/// the event will be published again after recovery (same EventId retained for consumer idempotency).
///
/// Multiple-instance safety: lease-based claiming (LockId + LockedUntilUtc) prevents two instances
/// from concurrently publishing the same row. Expired leases are recovered before each batch.
///
/// Poison records: one failed record sets its own NextAttemptAtUtc and continues; other records
/// in the same batch are processed independently. A single poison record cannot block the queue.
///
/// Broker unavailability: leaves the reservation committed and the outbox row pending for retry.
/// Database unavailability: logs and waits PollIntervalSeconds before retrying.
/// </summary>
public sealed class OutboxPublisherService(
    IOutboxRepository outboxRepository,
    IReservationEventPublisher publisher,
    IOptions<KafkaOptions> options,
    ILogger<OutboxPublisherService> logger) : BackgroundService
{
    private readonly KafkaOptions _options = options.Value;
    private readonly Guid _instanceId = Guid.NewGuid();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "OutboxPublisher {InstanceId} starting. ReservationTopic={ReservationTopic} " +
            "OrderLifecycleTopic={OrderLifecycleTopic} Enabled={Enabled}",
            _instanceId, _options.ReservationTopic, _options.OrderLifecycleTopic,
            _options.PublisherEnabled);

        if (!_options.PublisherEnabled)
        {
            logger.LogInformation("OutboxPublisher disabled by configuration. No events will be published.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Database or unexpected failure Ã¢â‚¬â€ wait before retrying.
                logger.LogError(ex, "OutboxPublisher {InstanceId} unexpected error in poll loop. Waiting {Delay}s.",
                    _instanceId, _options.PollIntervalSeconds);
            }

            try { await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        logger.LogInformation("OutboxPublisher {InstanceId} stopped.", _instanceId);
    }

    private async Task ProcessBatchAsync(CancellationToken cancellationToken)
    {
        var batch = await outboxRepository.ClaimBatchAsync(
            _instanceId,
            _options.BatchSize,
            TimeSpan.FromSeconds(_options.LeaseSeconds),
            cancellationToken);

        if (batch.Count == 0) return;

        logger.LogInformation("OutboxPublisher {InstanceId} claimed {Count} events.", _instanceId, batch.Count);

        foreach (var outboxEvent in batch)
        {
            if (cancellationToken.IsCancellationRequested) break;
            logger.LogInformation(
                "OutboxPublisher {InstanceId} dispatching EventId={EventId} EventType={EventType} " +
                "AggregateType={AggregateType} AggregateId={AggregateId} MessageKey={MessageKey}",
                _instanceId, outboxEvent.EventId, outboxEvent.EventType,
                outboxEvent.AggregateType, outboxEvent.AggregateId, outboxEvent.MessageKey);
            await PublishOneAsync(outboxEvent, cancellationToken);
        }
    }

    private async Task PublishOneAsync(OutboxEvent outboxEvent, CancellationToken cancellationToken)
    {
        try
        {
            var topic = IsOrderLifecycleEvent(outboxEvent)
                ? _options.OrderLifecycleTopic
                : _options.ReservationTopic;

                var (partition, offset) = await publisher.PublishAsync(
                    topic,
                    outboxEvent.MessageKey,
                    outboxEvent.Payload,
                    cancellationToken);

            // Mark processed ONLY after broker acknowledgement.
            await outboxRepository.MarkProcessedAsync(outboxEvent.Id, cancellationToken);

            logger.LogInformation(
                "OutboxPublisher published EventId={EventId} EventType={EventType} AggregateId={AggregateId} " +
                "Topic={Topic} Partition={Partition} Offset={Offset}",
                outboxEvent.EventId, outboxEvent.EventType, outboxEvent.AggregateId,
                topic, partition, offset);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Service stopping Ã¢â‚¬â€ do not record as failure; lease will expire and recover.
            logger.LogInformation("OutboxPublisher stopping during publish of EventId={EventId}.", outboxEvent.EventId);
        }
        catch (Exception ex)
        {
            var nextAttempt = CalculateNextAttempt(outboxEvent.AttemptCount + 1);
            var safeError = $"{ex.GetType().Name}: {ex.Message}";
            await outboxRepository.RecordFailureAsync(
                outboxEvent.Id,
                outboxEvent.AttemptCount + 1,
                nextAttempt,
                safeError,
                _options.MaxAttempts,
                cancellationToken);

            logger.LogWarning(
                "OutboxPublisher failed to publish EventId={EventId} EventType={EventType} " +
                "Attempt={Attempt}/{MaxAttempts} NextRetry={NextRetry} Error={ErrorType}",
                outboxEvent.EventId, outboxEvent.EventType,
                outboxEvent.AttemptCount + 1, _options.MaxAttempts,
                nextAttempt.ToString("o"), ex.GetType().Name);
        }
    }

    private static bool IsOrderLifecycleEvent(OutboxEvent outboxEvent) =>
        string.Equals(outboxEvent.AggregateType, "Order", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(outboxEvent.AggregateType, "Payment", StringComparison.OrdinalIgnoreCase) ||
        outboxEvent.EventType.StartsWith("Order", StringComparison.OrdinalIgnoreCase) ||
        outboxEvent.EventType.StartsWith("Payment", StringComparison.OrdinalIgnoreCase) ||
        outboxEvent.EventType is OrderLifecycleEventTypes.OrderCreated
            or OrderLifecycleEventTypes.OrderPreparing
            or OrderLifecycleEventTypes.OrderReady
            or OrderLifecycleEventTypes.OrderServed
            or OrderLifecycleEventTypes.OrderCancelled;

    /// <summary>
    /// Bounded exponential backoff: delay = min(maxDelay, initialDelay Ãƒâ€” 2^(attempt-1)).
    /// Guards against overflow by capping before exponentiation.
    /// </summary>
    internal DateTime CalculateNextAttempt(int attemptCount)
    {
        var initial = _options.InitialRetryDelaySeconds;
        var max = _options.MaxRetryDelaySeconds;
        int exponent = Math.Min(attemptCount - 1, 30); // 2^30 = 1 billion; prevents overflow
        double delaySecs = Math.Min(max, initial * Math.Pow(2, exponent));
        return DateTime.UtcNow.AddSeconds(delaySecs);
    }
}
