namespace ReservationService.Models;

public sealed record ReservationRescheduleCommand(int ReservationId, int ActorUserId, bool IsAdmin, int TableId, AvailabilitySearchCriteria Period);

public enum ReservationRescheduleOutcome { Updated, NotFound, Forbidden, InvalidState, TableNotFound, Unavailable }

public sealed record ReservationRescheduleResult(ReservationRescheduleOutcome Outcome, Reservation? Reservation = null);
