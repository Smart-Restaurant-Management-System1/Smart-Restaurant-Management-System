namespace ReservationService.Models;

/// <summary>Centralised local restaurant rules for advisory availability searches.</summary>
public sealed class AvailabilityRulesOptions
{
    public const string SectionName = "ReservationAvailability";

    public string TimeZoneId { get; set; } = "Asia/Colombo";
    public string OpeningTime { get; set; } = "10:00";
    public string ClosingTime { get; set; } = "22:00";
    public int MinimumDurationMinutes { get; set; } = 30;
    public int MaximumDurationMinutes { get; set; } = 240;
}
