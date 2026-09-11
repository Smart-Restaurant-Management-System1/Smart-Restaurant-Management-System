namespace ReservationService.Models;

public sealed record AvailabilitySearchCriteria(DateTime RequestedStart, DateTime RequestedEnd, int GuestCount);
