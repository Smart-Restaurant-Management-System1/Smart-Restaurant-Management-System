using System.Text.Json.Serialization;

namespace ReservationService.Events;

/// <summary>
/// SR-113 v1 payload for ReservationCancelled.
/// Emitted when status transitions TO Cancelled (customer self-cancel or admin cancel).
/// NOT emitted alongside ReservationStatusChanged for the same transition — see event matrix in docs.
/// </summary>
public sealed record ReservationCancelledPayload
{
    [JsonPropertyName("cancellationStatus")]
    public string CancellationStatus { get; init; } = "Cancelled";

    /// <summary>UTC time the cancellation was committed to the database.</summary>
    [JsonPropertyName("cancelledAtUtc")]
    public required DateTimeOffset CancelledAtUtc { get; init; }

    /// <summary>Internal customer identifier. No PII.</summary>
    [JsonPropertyName("customerId")]
    public required int CustomerId { get; init; }
}
