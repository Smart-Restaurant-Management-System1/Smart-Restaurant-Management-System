namespace ReservationService.Models;

public static class ReservationStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Cancelled = "Cancelled";
    public const string Completed = "Completed";

    public static bool IsKnown(string? value) => value is Pending or Confirmed or Cancelled or Completed;
}
