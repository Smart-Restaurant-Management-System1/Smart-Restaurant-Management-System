using System.Text.Json.Serialization;

namespace ReservationService.Events;

/// <summary>
/// SR-113 v1 payload for ReservationCreated.
/// Captures the full initial state at the moment the reservation row is committed.
/// StartDateTime and EndDateTime are restaurant-local wall-clock values (no UTC offset);
/// their timezone is defined by ReservationAvailability:TimeZoneId configuration.
/// CustomerId is included because downstream billing and notification services require it.
/// No PII (name, email, phone, payment) is included.
/// </summary>
public sealed record ReservationCreatedPayload
{
    [JsonPropertyName("tableId")]
    public required int TableId { get; init; }

    [JsonPropertyName("tableNumber")]
    public required string TableNumber { get; init; }

    /// <summary>Restaurant-local wall-clock start. No UTC offset — see timezone in service config.</summary>
    [JsonPropertyName("startDateTime")]
    public required DateTime StartDateTime { get; init; }

    /// <summary>Restaurant-local wall-clock end. No UTC offset — see timezone in service config.</summary>
    [JsonPropertyName("endDateTime")]
    public required DateTime EndDateTime { get; init; }

    [JsonPropertyName("guestCount")]
    public required int GuestCount { get; init; }

    [JsonPropertyName("initialStatus")]
    public required string InitialStatus { get; init; }

    /// <summary>Internal customer identifier only. No name, email, phone or payment data.</summary>
    [JsonPropertyName("customerId")]
    public required int CustomerId { get; init; }
}
