namespace ReservationService.Services;

/// <summary>
/// SR-112: Abstraction over the Kafka producer, injectable for unit testing.
/// The real implementation wraps Confluent.Kafka; tests inject a controllable mock.
/// </summary>
public interface IReservationEventPublisher : IDisposable
{
    /// <summary>
    /// Publish a serialized event payload to the reservation topic.
    /// Returns the partition and offset after broker acknowledgement.
    /// Throws on unrecoverable producer errors; callers should catch and record the failure.
    /// </summary>
    Task<(int Partition, long Offset)> PublishAsync(string topic, string messageKey, string payload, CancellationToken cancellationToken = default);
}
