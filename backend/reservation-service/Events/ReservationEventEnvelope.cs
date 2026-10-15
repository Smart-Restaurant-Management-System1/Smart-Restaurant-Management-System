using System.Text.Json.Serialization;

namespace ReservationService.Events;

/// <summary>
/// SR-113 v1 envelope wrapping every reservation lifecycle event.
/// All fields are required (non-null) unless marked nullable.
/// Timestamps use DateTimeOffset to carry explicit UTC offset — never serialize local/unspecified DateTime as UTC.
/// Restaurant-local reservation times (StartDateTime, EndDateTime) are wall-clock values with no offset; their
/// timezone is documented in ReservationAvailability:TimeZoneId configuration (default: Asia/Colombo).
/// </summary>
public sealed record ReservationEventEnvelope
{
    /// <summary>Stable unique identifier for this event occurrence. Reused on retry — consumers must deduplicate.</summary>
    [JsonPropertyName("eventId")]
    public required Guid EventId { get; init; }

    /// <summary>Stable event type name. Never renamed within schema version 1.</summary>
    [JsonPropertyName("eventType")]
    public required string EventType { get; init; }

    /// <summary>Numeric contract version. Increment only on breaking changes.</summary>
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; init; } = 1;

    /// <summary>UTC wall-clock time the business change occurred. ISO 8601 with Z suffix.</summary>
    [JsonPropertyName("occurredAtUtc")]
    public required DateTimeOffset OccurredAtUtc { get; init; }

    /// <summary>Numeric reservation identifier. Stable for the lifetime of the reservation.</summary>
    [JsonPropertyName("reservationId")]
    public required int ReservationId { get; init; }

    /// <summary>Human-readable booking reference, e.g. SR-ABCD-EFGH. Stable for the lifetime of the reservation.</summary>
    [JsonPropertyName("bookingReference")]
    public required string BookingReference { get; init; }

    /// <summary>Event-type-specific payload. Deserialize according to eventType + schemaVersion.</summary>
    [JsonPropertyName("payload")]
    public required object Payload { get; init; }
}
