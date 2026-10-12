namespace ReservationService.Models;

/// <summary>
/// PayHere Sandbox configuration options for SR-280 / SR-283.
/// Credentials are read from configuration or Azure secrets. Never commit real credentials to Git.
/// </summary>
public sealed class PayHereOptions
{
    public const string SectionName = "PayHere";

    public string MerchantId { get; set; } = "1238640";
    public string LocalMerchantSecret { get; set; } = "MzQ1MTU2MDU1MzM1MjQzMDA5MTQxNjQwMzE4ODIxNzU2NDE0MTI=";
    public string AzureMerchantSecret { get; set; } = "MzQ1MTU2MDU1MzM1MjQzMDA5MTQxNjQwMzE4ODIxNzU2NDE0MTI=";
    public string MerchantSecret { get; set; } = "MzQ1MTU2MDU1MzM1MjQzMDA5MTQxNjQwMzE4ODIxNzU2NDE0MTI=";
    public bool IsSandbox { get; set; } = true;
    public string SandboxCheckoutUrl { get; set; } = "https://sandbox.payhere.lk/pay/checkout";
    public string LiveCheckoutUrl { get; set; } = "https://www.payhere.lk/pay/checkout";
    public string CheckoutUrl => IsSandbox ? SandboxCheckoutUrl : LiveCheckoutUrl;
    // --- 1. Localhost Environment URLs (3 URLs) ---
    public string LocalReturnUrl { get; set; } = "http://localhost/orders/track?payment=returned";
    public string LocalCancelUrl { get; set; } = "http://localhost/orders/track?payment=cancelled";
    public string LocalNotifyUrl { get; set; } = "http://localhost:5000/api/payments/payhere/notify";

    // --- 2. Azure Deployed Cloud Environment URLs (3 URLs) ---
    public string AzureReturnUrl { get; set; } = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/orders/track?payment=returned";
    public string AzureCancelUrl { get; set; } = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/orders/track?payment=cancelled";
    // notify_url MUST use the frontend-web domain (the PayHere registered app domain).
    // The nginx proxy at frontend-web forwards /reservation-api/api/* -> reservation-api:5000/api/*
    public string AzureNotifyUrl { get; set; } = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify";

    // Backward-compatible fallback properties:
    public string NotifyUrl { get; set; } = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify";
    public string ReturnUrl { get; set; } = "http://localhost/orders/track?payment=returned";
    public string CancelUrl { get; set; } = "http://localhost/orders/track?payment=cancelled";
    public string Currency { get; set; } = "LKR";

    /// <summary>
    /// Intelligently resolves the appropriate URLs based on client origin / environment.
    /// </summary>
    public (string ReturnUrl, string CancelUrl, string NotifyUrl) ResolveUrls(string? requestOrigin)
    {
        bool isAzure = !string.IsNullOrWhiteSpace(requestOrigin) &&
                       requestOrigin.Contains("azurecontainerapps.io", StringComparison.OrdinalIgnoreCase);

        if (isAzure)
        {
            return (
                string.IsNullOrWhiteSpace(AzureReturnUrl) ? ReturnUrl : AzureReturnUrl,
                string.IsNullOrWhiteSpace(AzureCancelUrl) ? CancelUrl : AzureCancelUrl,
                string.IsNullOrWhiteSpace(AzureNotifyUrl) ? NotifyUrl : AzureNotifyUrl
            );
        }

        return (
            string.IsNullOrWhiteSpace(LocalReturnUrl) ? ReturnUrl : LocalReturnUrl,
            string.IsNullOrWhiteSpace(LocalCancelUrl) ? CancelUrl : LocalCancelUrl,
            string.IsNullOrWhiteSpace(LocalNotifyUrl) || LocalNotifyUrl.Contains("localhost")
                ? (string.IsNullOrWhiteSpace(AzureNotifyUrl) ? NotifyUrl : AzureNotifyUrl)
                : LocalNotifyUrl
        );
    }

    /// <summary>
    /// Intelligently resolves the appropriate Merchant Secret based on client origin / environment.
    /// Priority for Azure requests: AzureMerchantSecret -> MerchantSecret -> LocalMerchantSecret
    /// Priority for Local requests: LocalMerchantSecret -> MerchantSecret -> AzureMerchantSecret
    /// </summary>
    public (string Secret, string SourceName) ResolveMerchantSecretWithSource(string? requestOrigin)
    {
        bool isAzure = !string.IsNullOrWhiteSpace(requestOrigin) &&
                       (requestOrigin.Contains("azurecontainerapps.io", StringComparison.OrdinalIgnoreCase) ||
                        requestOrigin.Contains("cinnamonbistro", StringComparison.OrdinalIgnoreCase));

        if (isAzure)
        {
            if (!string.IsNullOrWhiteSpace(AzureMerchantSecret))
            {
                return (AzureMerchantSecret, nameof(AzureMerchantSecret));
            }

            if (!string.IsNullOrWhiteSpace(MerchantSecret))
            {
                return (MerchantSecret, nameof(MerchantSecret));
            }

            return (LocalMerchantSecret, nameof(LocalMerchantSecret));
        }

        if (!string.IsNullOrWhiteSpace(LocalMerchantSecret))
        {
            return (LocalMerchantSecret, nameof(LocalMerchantSecret));
        }

        if (!string.IsNullOrWhiteSpace(MerchantSecret))
        {
            return (MerchantSecret, nameof(MerchantSecret));
        }

        return (AzureMerchantSecret, nameof(AzureMerchantSecret));
    }

    public string ResolveMerchantSecret(string? requestOrigin)
    {
        return ResolveMerchantSecretWithSource(requestOrigin).Secret;
    }
}
