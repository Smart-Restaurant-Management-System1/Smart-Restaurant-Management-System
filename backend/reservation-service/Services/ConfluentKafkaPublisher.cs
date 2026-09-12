using Confluent.Kafka;
using Microsoft.Extensions.Options;
using ReservationService.Models;

namespace ReservationService.Services;

/// <summary>
/// SR-112: Confluent.Kafka-backed producer.
/// Configured with acks=all for strongest delivery guarantee within the broker.
/// SecurityProtocol and SASL settings are applied only when configured.
/// Credentials are never logged.
/// </summary>
public sealed class ConfluentKafkaPublisher : IReservationEventPublisher
{
    private readonly IProducer<string, string> _producer;

    public ConfluentKafkaPublisher(IOptions<KafkaOptions> options)
    {
        var o = options.Value;
        var config = new ProducerConfig
        {
            BootstrapServers = o.BootstrapServers,
            ClientId = o.ClientId,
            Acks = Acks.All,
            EnableIdempotence = false, // at-least-once: idempotence would require exactly-once coordination with MySQL
            MessageSendMaxRetries = 0, // retries handled by outbox layer — do not double-retry here
            SocketTimeoutMs = 15_000,
            MessageTimeoutMs = 20_000,
        };

        if (!string.Equals(o.SecurityProtocol, "plaintext", StringComparison.OrdinalIgnoreCase))
        {
            config.SecurityProtocol = Enum.Parse<SecurityProtocol>(o.SecurityProtocol, true);
            if (o.SecurityProtocol.Contains("sasl", StringComparison.OrdinalIgnoreCase))
            {
                config.SaslMechanism = Enum.Parse<SaslMechanism>(o.SaslMechanism.Replace("-", ""), true);
                config.SaslUsername = o.SaslUsername;
                config.SaslPassword = o.SaslPassword; // never logged
            }
        }

        _producer = new ProducerBuilder<string, string>(config).Build();
    }

    public async Task<(int Partition, long Offset)> PublishAsync(string topic, string messageKey, string payload, CancellationToken cancellationToken = default)
    {
        var message = new Message<string, string> { Key = messageKey, Value = payload };
        var result = await _producer.ProduceAsync(topic, message, cancellationToken);
        return (result.Partition.Value, result.Offset.Value);
    }

    public void Dispose()
    {
        _producer.Flush(TimeSpan.FromSeconds(5));
        _producer.Dispose();
    }
}
