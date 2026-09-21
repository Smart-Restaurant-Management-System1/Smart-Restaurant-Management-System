using System.ComponentModel.DataAnnotations;

namespace ReservationService.Models;

/// <summary>
/// SR-112 Kafka publisher configuration.
/// Bound from the "Kafka" configuration section.
/// Required settings are validated at startup when PublisherEnabled = true.
/// Never log SaslPassword or connection strings.
/// </summary>
public sealed class KafkaOptions
{
    public const string SectionName = "Kafka";

    /// <summary>Comma-separated list of broker host:port pairs.</summary>
    [Required]
    public string BootstrapServers { get; set; } = string.Empty;

    /// <summary>Topic name for reservation lifecycle events.</summary>
    [Required]
    public string ReservationTopic { get; set; } = "restaurant.reservations.v1";
    /// <summary>Topic name for order lifecycle events.</summary>
    [Required]
    public string OrderLifecycleTopic { get; set; } = "order-lifecycle-events";


    /// <summary>Kafka producer client ID shown in broker logs.</summary>
    public string ClientId { get; set; } = "smart-restaurant-reservation-service";

    /// <summary>plaintext | ssl | sasl_ssl | sasl_plaintext</summary>
    public string SecurityProtocol { get; set; } = "plaintext";

    /// <summary>PLAIN | SCRAM-SHA-256 | SCRAM-SHA-512. Only used when SecurityProtocol includes SASL.</summary>
    public string SaslMechanism { get; set; } = "PLAIN";

    /// <summary>SASL username. Set via environment variable; never commit real values.</summary>
    public string? SaslUsername { get; set; }

    /// <summary>SASL password. Set via environment variable; never commit real values. Never logged.</summary>
    public string? SaslPassword { get; set; }

    /// <summary>When false the background publisher does not start (useful for test/dev without a broker).</summary>
    public bool PublisherEnabled { get; set; } = true;

    /// <summary>Maximum outbox rows claimed per poll cycle.</summary>
    public int BatchSize { get; set; } = 50;

    /// <summary>Seconds between poll cycles when no pending events exist.</summary>
    public int PollIntervalSeconds { get; set; } = 5;

    /// <summary>Maximum publish attempts before a row is moved to DeadLetter.</summary>
    public int MaxAttempts { get; set; } = 10;

    /// <summary>Initial retry delay in seconds (doubles on each attempt).</summary>
    public int InitialRetryDelaySeconds { get; set; } = 5;

    /// <summary>Maximum retry delay cap in seconds.</summary>
    public int MaxRetryDelaySeconds { get; set; } = 300;

    /// <summary>How long a publisher holds a processing lease before it becomes recoverable.</summary>
    public int LeaseSeconds { get; set; } = 60;
}
