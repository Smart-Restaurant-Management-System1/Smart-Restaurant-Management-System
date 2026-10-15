namespace ReservationService.Models;

public enum ReservationCancellationOutcome { Cancelled, NotFound, InvalidState }
public sealed record ReservationCancellationResult(ReservationCancellationOutcome Outcome, Reservation? Reservation = null);
