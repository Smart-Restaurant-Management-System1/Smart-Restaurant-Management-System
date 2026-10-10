namespace ReservationService.Models;

/// <summary>
/// PayHere Sandbox configuration options for SR-280 / SR-283.
/// Credentials are read from configuration or Azure secrets. Never commit real credentials to Git.
/// </summary>
public sealed class PayHereOptions
{
    public const string SectionName = "PayHere";

    public string MerchantId { get; set; } = "1238640";
    public string MerchantSecret { get; set; } = "OTg3MzY4NjE2MjQ1NDMzMjEzOTQxNzY0NDQwOTMxNTM4Mzg5OTY5";
    public bool IsSandbox { get; set; } = true;
    public string SandboxCheckoutUrl { get; set; } = "https://sandbox.payhere.lk/pay/checkout";
    public string LiveCheckoutUrl { get; set; } = "https://www.payhere.lk/pay/checkout";
    public string CheckoutUrl => IsSandbox ? SandboxCheckoutUrl : LiveCheckoutUrl;
    public string NotifyUrl { get; set; } = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify";
    public string ReturnUrl { get; set; } = "http://localhost/orders/track?payment=returned";
    public string CancelUrl { get; set; } = "http://localhost/orders/track?payment=cancelled";
    public string Currency { get; set; } = "LKR";
}
