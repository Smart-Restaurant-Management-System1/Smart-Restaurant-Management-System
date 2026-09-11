namespace ReservationService.Models;

public sealed record AdminReservationQuery(DateOnly? VisitFrom, DateOnly? VisitTo, string? Status, string? TableNumber, string? BookingReference, int Page, int PageSize);
