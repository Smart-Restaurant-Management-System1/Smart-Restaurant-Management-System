using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace ReservationService.Services;

public static class PayHereSecurityHelper
{
    /// <summary>
    /// Computes the PayHere checkout hash required by the hosted checkout form:
    /// strtoupper(md5(merchant_id + order_id + amount_formatted + currency + strtoupper(md5(merchant_secret))))
    /// </summary>
    public static string GenerateCheckoutHash(
        string merchantId,
        string orderId,
        decimal amount,
        string currency,
        string merchantSecret)
    {
        var secretHash = ComputeMd5Hex(merchantSecret).ToUpperInvariant();
        var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var rawString = $"{merchantId}{orderId}{formattedAmount}{currency}{secretHash}";
        return ComputeMd5Hex(rawString).ToUpperInvariant();
    }

    /// <summary>
    /// Validates the server-side callback md5sig using constant-time comparison:
    /// strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
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

        var secretHash = ComputeMd5Hex(merchantSecret).ToUpperInvariant();
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

    private static string ComputeMd5Hex(string input)
    {
        var inputBytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = MD5.HashData(inputBytes);
        return Convert.ToHexString(hashBytes);
    }
}
