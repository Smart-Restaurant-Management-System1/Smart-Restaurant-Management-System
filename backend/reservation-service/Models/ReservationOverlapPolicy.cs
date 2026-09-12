namespace ReservationService.Models;

/// <summary>Canonical half-open interval rule used to document and test the SQL overlap predicate.</summary>
public static class ReservationOverlapPolicy
{
    public static bool Blocks(DateTime existingStart, DateTime existingEnd, DateTime requestedStart, DateTime requestedEnd, string status) =>
        status is ReservationStatus.Pending or ReservationStatus.Confirmed && existingStart < requestedEnd && existingEnd > requestedStart;
}
