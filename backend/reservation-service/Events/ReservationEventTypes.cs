namespace ReservationService.Events;

/// <summary>Stable string constants for reservation event types. Never renamed in schema version 1.</summary>
public static class ReservationEventTypes
{
    public const string ReservationCreated = "ReservationCreated";
    public const string ReservationUpdated = "ReservationUpdated";
    public const string ReservationCancelled = "ReservationCancelled";
    public const string ReservationStatusChanged = "ReservationStatusChanged";
}
