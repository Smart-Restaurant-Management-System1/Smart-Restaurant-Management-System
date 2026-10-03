namespace ReservationService.Models;

public sealed class Payment
{
    public int PaymentId { get; set; }
    public int CustomerId { get; set; }
    public string OrderType { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string PaymentMethod { get; set; } = PaymentConstants.PaymentMethods.PayHere;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string Status { get; set; } = PaymentConstants.PaymentStatuses.Pending;
    public string MerchantOrderReference { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
    public string? SlipUrl { get; set; }
    public string? CustomerNotes { get; set; }
    public int? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
