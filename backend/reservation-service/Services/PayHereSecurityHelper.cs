using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace ReservationService.Services;

public static class PayHereSecurityHelper
{
    /// <summary>
    /// Normalizes the merchant secret for PayHere hashing:
    /// - If the merchant secret is Base64 encoded (e.g. ends with '=' or decodes into a clean ASCII/alphanumeric secret),
    ///   decodes it using UTF-8 to its underlying plain text value.
    /// - If it is already a plain text secret (e.g. 40-digit numeric or alphanumeric string), uses it directly.
    /// </summary>
    public static string NormalizeMerchantSecret(string merchantSecret)
    {
        if (string.IsNullOrWhiteSpace(merchantSecret))
        {
            return string.Empty;
        }

        var trimmed = merchantSecret.Trim();

        if (trimmed.EndsWith('=') || (trimmed.Length >= 4 && trimmed.Length % 4 == 0))
        {
            try
            {
                var bytes = Convert.FromBase64String(trimmed);
                var decoded = Encoding.UTF8.GetString(bytes);

                // A valid decoded PayHere secret must be printable alphanumeric characters and at least 16 chars
                if (decoded.Length >= 16 && decoded.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'z' or >= 'A' and <= 'Z' or '-' or '_'))
                {
                    return decoded;
                }
            }
            catch
            {
                // Not valid Base64, fall back to raw string
            }
        }

        return trimmed;
    }

    /// <summary>
    /// Computes the PayHere checkout hash required by the hosted checkout form:
    /// strtoupper(md5(merchant_id + order_id + amount_formatted + currency + strtoupper(md5(decoded_merchant_secret))))
    /// </summary>
    public static string GenerateCheckoutHash(
        string merchantId,
        string orderId,
        decimal amount,
        string currency,
        string merchantSecret)
    {
        var normalizedSecret = NormalizeMerchantSecret(merchantSecret);
        var secretHash = ComputeMd5Hex(normalizedSecret).ToUpperInvariant();
        var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var rawString = $"{merchantId}{orderId}{formattedAmount}{currency}{secretHash}";
        return ComputeMd5Hex(rawString).ToUpperInvariant();
    }

    /// <summary>
    /// Validates the server-side callback md5sig using constant-time comparison:
    /// strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(decoded_merchant_secret))))
    /// </summary>
    public static bool VerifyNotificationSignature(
        string merchantId,
        string orderId,
        string payhereAmount,
        string payhereCurrency,
        string statusCode,
        string merchantSecret,
        string receivedMd5Sig)
    {
        if (string.IsNullOrWhiteSpace(receivedMd5Sig))
        {
            return false;
        }

        var normalizedSecret = NormalizeMerchantSecret(merchantSecret);
        var secretHash = ComputeMd5Hex(normalizedSecret).ToUpperInvariant();
        var rawString = $"{merchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{secretHash}";
        var expectedSig = ComputeMd5Hex(rawString).ToUpperInvariant();

        var expectedBytes = Encoding.UTF8.GetBytes(expectedSig);
        var receivedBytes = Encoding.UTF8.GetBytes(receivedMd5Sig.Trim().ToUpperInvariant());

        if (expectedBytes.Length != receivedBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes);
    }

    /// <summary>
    /// Computes the MD5 of the normalized (decoded if Base64) merchant secret.
    /// </summary>
    public static string ComputeSecretMd5(string merchantSecret)
    {
        var normalizedSecret = NormalizeMerchantSecret(merchantSecret);
        return ComputeMd5Hex(normalizedSecret).ToUpperInvariant();
    }

    public static string? ComputeBase64DecodedSecretMd5(string merchantSecret)
    {
        try
        {
            var bytes = Convert.FromBase64String(merchantSecret);
            var decoded = Encoding.UTF8.GetString(bytes);
            return ComputeMd5Hex(decoded).ToUpperInvariant();
        }
        catch
        {
            return null;
        }
    }

    private static string ComputeMd5Hex(string input)
    {
        var inputBytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = MD5.HashData(inputBytes);
        return Convert.ToHexString(hashBytes);
    }
}
