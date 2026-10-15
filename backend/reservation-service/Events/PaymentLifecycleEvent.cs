namespace ReservationService.Events;

public sealed class PaymentLifecycleEvent
{
    public Guid EventId { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public int PaymentId { get; set; }
    public int CustomerId { get; set; }
    public string OrderType { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string MerchantOrderReference { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
}
