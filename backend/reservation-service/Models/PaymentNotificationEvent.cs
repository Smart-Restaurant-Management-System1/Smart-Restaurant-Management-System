namespace ReservationService.Models;

public sealed class PaymentNotificationEvent
{
    public int NotificationId { get; set; }
    public string Provider { get; set; } = "PayHere";
    public string ProviderPaymentId { get; set; } = string.Empty;
    public string MerchantOrderReference { get; set; } = string.Empty;
    public string StatusCode { get; set; } = string.Empty;
    public decimal PayHereAmount { get; set; }
    public string PayHereCurrency { get; set; } = "LKR";
    public string SignatureHash { get; set; } = string.Empty;
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public bool IsSuccess { get; set; } = true;
}
