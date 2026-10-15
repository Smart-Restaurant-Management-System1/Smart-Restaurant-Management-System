namespace ReservationService.Models;

public sealed record ReservationCreationCommand(int CustomerId, int TableId, AvailabilitySearchCriteria Period, string? IdempotencyKey);

public enum ReservationCreateOutcome { Created, Replayed, TableNotFound, Unavailable }

public sealed record ReservationCreateResult(ReservationCreateOutcome Outcome, Reservation? Reservation = null);
