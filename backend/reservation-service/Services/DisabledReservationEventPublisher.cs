
namespace ReservationService.Services;

/// <summary>
/// No-operation event publisher used when Kafka publishing is disabled.
/// This implementation does not create a Kafka producer or connect to a broker.
/// </summary>
public sealed class DisabledReservationEventPublisher
    : IReservationEventPublisher
{
    public Task<(int Partition, long Offset)> PublishAsync(
        string topic,
        string messageKey,
        string payload,
        CancellationToken cancellationToken = default)
    {
        return Task.FromException<(int Partition, long Offset)>(
            new InvalidOperationException(
                "Kafka event publishing is disabled in the current environment."
            )
        );
    }

    public void Dispose()
    {
        // No resources to dispose because no Kafka producer is created.
    }
}