namespace ReservationService.Models;

/// <summary>
/// Configuration options for automated cancellation of unpaid orders.
/// </summary>
public sealed class OrderExpiryOptions
{
    public const string SectionName = "OrderExpiry";

    /// <summary>
    /// Whether the background order expiry worker is active.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Polling interval between background expiry checks (in minutes). Defaults to 2 minutes.
    /// </summary>
    public int PollIntervalMinutes { get; set; } = 2;

    /// <summary>
    /// Age threshold after which unpaid Received/Pending orders are automatically cancelled (in minutes). Defaults to 30 minutes.
    /// </summary>
    public int ExpiryThresholdMinutes { get; set; } = 30;
}

/// <summary>
/// Results returned from an order expiry execution cycle.
/// </summary>
public sealed class OrderExpiryResult
{
    public int ExpiredDineInOrdersCount { get; set; }
    public int ExpiredPreOrdersCount { get; set; }
    public List<string> ExpiredOrderReferences { get; set; } = new();

    public int TotalExpired => ExpiredDineInOrdersCount + ExpiredPreOrdersCount;
}
