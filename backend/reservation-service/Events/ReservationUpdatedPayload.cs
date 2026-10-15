using System.Text.Json.Serialization;

namespace ReservationService.Events;

/// <summary>
/// SR-113 v1 payload for ReservationUpdated (reschedule/edit).
/// Design approach: current snapshot — the payload represents the fully committed state after the update.
/// Downstream consumers receive what was actually written to the database. This avoids ambiguity about
/// which fields changed and eliminates the need to track previous values for most use cases.
/// StartDateTime and EndDateTime are restaurant-local wall-clock values (no UTC offset).
/// </summary>
public sealed record ReservationUpdatedPayload
{
    [JsonPropertyName("tableId")]
    public required int TableId { get; init; }

    [JsonPropertyName("tableNumber")]
    public required string TableNumber { get; init; }

    /// <summary>Restaurant-local wall-clock start after the update. No UTC offset.</summary>
    [JsonPropertyName("startDateTime")]
    public required DateTime StartDateTime { get; init; }

    /// <summary>Restaurant-local wall-clock end after the update. No UTC offset.</summary>
    [JsonPropertyName("endDateTime")]
    public required DateTime EndDateTime { get; init; }

    [JsonPropertyName("guestCount")]
    public required int GuestCount { get; init; }

    [JsonPropertyName("status")]
    public required string Status { get; init; }

    /// <summary>UTC timestamp when the update was committed. ISO 8601 with Z suffix.</summary>
    [JsonPropertyName("updatedAtUtc")]
    public required DateTimeOffset UpdatedAtUtc { get; init; }
}
