namespace ReservationService.Models;

/// <summary>Single reservation lifecycle policy used by customer and administrator status actions.</summary>
public static class ReservationStatusTransitionPolicy
{
    public static bool IsAllowed(string currentStatus, string targetStatus) =>
        (currentStatus, targetStatus) switch
        {
            (ReservationStatus.Pending, ReservationStatus.Confirmed) => true,
            (ReservationStatus.Pending, ReservationStatus.Cancelled) => true,
            (ReservationStatus.Confirmed, ReservationStatus.Cancelled) => true,
            (ReservationStatus.Confirmed, ReservationStatus.Completed) => true,
            _ => false
        };
}
