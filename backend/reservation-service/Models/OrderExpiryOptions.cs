namespace ReservationService.Models;

public sealed class OrderExpiryOptions
{
    public const string SectionName = "OrderExpiry";
    public bool Enabled { get; set; } = true;
    public int PollIntervalMinutes { get; set; } = 2;
    public int ExpiryThresholdMinutes { get; set; } = 30;
}

public sealed class OrderExpiryResult
{
    public int ExpiredDineInOrdersCount { get; set; }
    public int ExpiredPreOrdersCount { get; set; }
    public List<string> ExpiredOrderReferences { get; set; } = new();
    public int TotalExpired => ExpiredDineInOrdersCount + ExpiredPreOrdersCount;
}
