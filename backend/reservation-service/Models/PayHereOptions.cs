namespace ReservationService.Models;

/// <summary>
/// PayHere Sandbox configuration options for SR-280 / SR-283.
/// Credentials are read from configuration or Azure secrets. Never commit real credentials to Git.
/// </summary>
public sealed class PayHereOptions
{
    public const string SectionName = "PayHere";

    public string MerchantId { get; set; } = "1211149";
    public string MerchantSecret { get; set; } = "sandbox_secret_placeholder";
    public bool IsSandbox { get; set; } = true;
    public string SandboxCheckoutUrl { get; set; } = "https://sandbox.payhere.lk/pay/checkout";
    public string LiveCheckoutUrl { get; set; } = "https://www.payhere.lk/pay/checkout";
    public string CheckoutUrl => IsSandbox ? SandboxCheckoutUrl : LiveCheckoutUrl;
    public string NotifyUrl { get; set; } = "http://localhost:5000/api/payments/payhere/notify";
    public string ReturnUrl { get; set; } = "http://localhost/orders?payment=returned";
    public string CancelUrl { get; set; } = "http://localhost/orders?payment=cancelled";
    public string Currency { get; set; } = "LKR";
}
