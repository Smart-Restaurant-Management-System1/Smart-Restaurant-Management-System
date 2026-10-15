using System.Text.Json.Serialization;

namespace ReservationService.Events;

/// <summary>
/// SR-113 v1 payload for ReservationStatusChanged.
/// Emitted for admin-driven status transitions that are NOT cancellation:
///   Pending → Confirmed
///   Confirmed → Completed
/// Cancellation transitions emit ReservationCancelled instead — see event matrix in docs.
/// </summary>
public sealed record ReservationStatusChangedPayload
{
    [JsonPropertyName("previousStatus")]
    public required string PreviousStatus { get; init; }

    [JsonPropertyName("currentStatus")]
    public required string CurrentStatus { get; init; }

    /// <summary>UTC time the status change was committed to the database.</summary>
    [JsonPropertyName("changedAtUtc")]
    public required DateTimeOffset ChangedAtUtc { get; init; }
}
