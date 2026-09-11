namespace ReservationService.Models;

public sealed record ReservationHistoryPage(IReadOnlyList<Reservation> Items, int Page, int PageSize, int TotalCount);

public enum ReservationStatusUpdateOutcome { Updated, NotFound, Conflict }
