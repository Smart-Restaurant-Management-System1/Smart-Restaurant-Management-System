using ReservationService.Models;

namespace ReservationService.Events;

/// <summary>
/// Builds versioned event envelopes from committed Reservation domain objects.
/// All DateTimeOffset values are constructed as UTC (offset = 00:00).
/// All events share schema version 1 and the common envelope structure.
/// </summary>
public static class ReservationEventFactory
{
    public static ReservationEventEnvelope Created(Reservation reservation, DateTimeOffset occurredAtUtc) =>
        Envelope(ReservationEventTypes.ReservationCreated, reservation, occurredAtUtc,
            new ReservationCreatedPayload
            {
                TableId = reservation.TableId,
                TableNumber = reservation.TableNumber,
                StartDateTime = reservation.StartDateTime,
                EndDateTime = reservation.EndDateTime,
                GuestCount = reservation.GuestCount,
                InitialStatus = reservation.Status,
                CustomerId = reservation.CustomerId,
            });

    public static ReservationEventEnvelope Updated(Reservation reservation, DateTimeOffset occurredAtUtc) =>
        Envelope(ReservationEventTypes.ReservationUpdated, reservation, occurredAtUtc,
            new ReservationUpdatedPayload
            {
                TableId = reservation.TableId,
                TableNumber = reservation.TableNumber,
                StartDateTime = reservation.StartDateTime,
                EndDateTime = reservation.EndDateTime,
                GuestCount = reservation.GuestCount,
                Status = reservation.Status,
                // occurredAtUtc is the authoritative UTC time for this event (same moment as UpdatedAt row).
                UpdatedAtUtc = occurredAtUtc,
            });

    public static ReservationEventEnvelope Cancelled(Reservation reservation, DateTimeOffset occurredAtUtc) =>
        Envelope(ReservationEventTypes.ReservationCancelled, reservation, occurredAtUtc,
            new ReservationCancelledPayload
            {
                CancelledAtUtc = occurredAtUtc,
                CustomerId = reservation.CustomerId,
            });

    public static ReservationEventEnvelope StatusChanged(
        Reservation reservation, string previousStatus, DateTimeOffset occurredAtUtc) =>
        Envelope(ReservationEventTypes.ReservationStatusChanged, reservation, occurredAtUtc,
            new ReservationStatusChangedPayload
            {
                PreviousStatus = previousStatus,
                CurrentStatus = reservation.Status,
                ChangedAtUtc = occurredAtUtc,
            });

    private static ReservationEventEnvelope Envelope(
        string eventType, Reservation reservation, DateTimeOffset occurredAtUtc, object payload) =>
        new()
        {
            EventId = Guid.NewGuid(),
            EventType = eventType,
            SchemaVersion = 1,
            OccurredAtUtc = occurredAtUtc,
            ReservationId = reservation.Id,
            BookingReference = reservation.BookingReference,
            Payload = payload,
        };
}
