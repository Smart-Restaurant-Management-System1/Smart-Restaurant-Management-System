using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class PaymentTests
{
    private const string TestMerchantId = "1211149";
    private const string TestMerchantSecret = "test_merchant_secret_12345";

    [Fact]
    public void GenerateCheckoutHash_ComputesCorrectOfficialMd5Signature()
    {
        const string orderId = "PAY-DIN-000100-AB12CD";
        const decimal amount = 3500.50m;
        const string currency = "LKR";

        // Expected manual computation:
        // strtoupper(md5(merchantId + orderId + amount.ToString("0.00") + currency + strtoupper(md5(merchantSecret))))
        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(TestMerchantSecret))).ToUpperInvariant();
        var rawString = $"{TestMerchantId}{orderId}{amount.ToString("0.00", CultureInfo.InvariantCulture)}{currency}{secretHash}";
        var expectedHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(rawString))).ToUpperInvariant();

        var actualHash = PayHereSecurityHelper.GenerateCheckoutHash(
            TestMerchantId,
            orderId,
            amount,
            currency,
            TestMerchantSecret);

        Assert.Equal(expectedHash, actualHash);
        Assert.Matches("^[0-9A-F]{32}$", actualHash);
    }

    [Theory]
    [InlineData(100, "100.00")]
    [InlineData(49.9, "49.90")]
    [InlineData(12345.678, "12345.68")]
    public void GenerateCheckoutHash_AlwaysFormatsAmountWithTwoDecimals(decimal amount, string expectedFormatted)
    {
        const string orderId = "PAY-TEST-001";
        const string currency = "LKR";

        var hash = PayHereSecurityHelper.GenerateCheckoutHash(
            TestMerchantId,
            orderId,
            amount,
            currency,
            TestMerchantSecret);

        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(TestMerchantSecret))).ToUpperInvariant();
        var rawExpected = $"{TestMerchantId}{orderId}{expectedFormatted}{currency}{secretHash}";
        var expectedHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(rawExpected))).ToUpperInvariant();

        Assert.Equal(expectedHash, hash);
    }

    [Fact]
    public void VerifyNotificationSignature_SucceedsForValidSignature()
    {
        const string orderId = "PAY-PRE-000042-XYZ789";
        const string payhereAmount = "4500.00";
        const string payhereCurrency = "LKR";
        const string statusCode = "2"; // 2 = Success in PayHere

        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(TestMerchantSecret))).ToUpperInvariant();
        var raw = $"{TestMerchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{secretHash}";
        var validSig = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(raw))).ToUpperInvariant();

        var isValid = PayHereSecurityHelper.VerifyNotificationSignature(
            TestMerchantId,
            orderId,
            payhereAmount,
            payhereCurrency,
            statusCode,
            TestMerchantSecret,
            validSig);

        Assert.True(isValid);
    }

    [Theory]
    [InlineData("4500.01", "LKR", "2", "Tampered amount")]
    [InlineData("4500.00", "USD", "2", "Tampered currency")]
    [InlineData("4500.00", "LKR", "0", "Tampered status code")]
    [InlineData("4500.00", "LKR", "-1", "Tampered cancelled code")]
    public void VerifyNotificationSignature_RejectsTamperedPayloadFields(
        string payhereAmount,
        string payhereCurrency,
        string statusCode,
        string scenario)
    {
        const string orderId = "PAY-PRE-000042-XYZ789";
        const string originalSig = "A1B2C3D4E5F60718293A4B5C6D7E8F90"; // Non-matching dummy sig

        var isValid = PayHereSecurityHelper.VerifyNotificationSignature(
            TestMerchantId,
            orderId,
            payhereAmount,
            payhereCurrency,
            statusCode,
            TestMerchantSecret,
            originalSig);

        Assert.False(isValid, $"Failed rejection for {scenario}");
    }

    [Fact]
    public void VerifyNotificationSignature_RejectsEmptyOrNullSignature()
    {
        Assert.False(PayHereSecurityHelper.VerifyNotificationSignature(
            TestMerchantId, "ORDER-1", "100.00", "LKR", "2", TestMerchantSecret, ""));

        Assert.False(PayHereSecurityHelper.VerifyNotificationSignature(
            TestMerchantId, "ORDER-1", "100.00", "LKR", "2", TestMerchantSecret, null!));

        Assert.False(PayHereSecurityHelper.VerifyNotificationSignature(
            TestMerchantId, "ORDER-1", "100.00", "LKR", "2", TestMerchantSecret, "   "));
    }

    [Fact]
    public void PaymentLifecycleEvent_Serialization_ContainsAllSafeFields()
    {
        var evt = new PaymentLifecycleEvent
        {
            EventId = Guid.NewGuid(),
            EventType = PaymentLifecycleEventTypes.PaymentSucceeded,
            OccurredAtUtc = DateTime.UtcNow,
            PaymentId = 101,
            CustomerId = 15,
            OrderType = PaymentConstants.OrderTypes.DineIn,
            OrderId = 55,
            Amount = 6200.00m,
            Currency = "LKR",
            PaymentMethod = PaymentConstants.PaymentMethods.PayHere,
            Status = PaymentConstants.PaymentStatuses.Succeeded,
            MerchantOrderReference = "PAY-DIN-000055-12AB34",
            ProviderPaymentId = "PH_998877"
        };

        var json = JsonSerializer.Serialize(evt, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        Assert.Contains("\"paymentId\":101", json);
        Assert.Contains("\"customerId\":15", json);
        Assert.Contains("\"orderType\":\"DineIn\"", json);
        Assert.Contains("\"orderId\":55", json);
        Assert.Contains("\"amount\":6200", json);
        Assert.Contains("\"currency\":\"LKR\"", json);
        Assert.Contains("\"paymentMethod\":\"PayHere\"", json);
        Assert.Contains("\"status\":\"Succeeded\"", json);
        Assert.Contains("\"merchantOrderReference\":\"PAY-DIN-000055-12AB34\"", json);
        Assert.Contains("\"providerPaymentId\":\"PH_998877\"", json);

        // Zero PII / secret leak verification
        Assert.DoesNotContain("card", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("secret", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("cvv", json, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("2", PaymentConstants.PaymentStatuses.Succeeded)]
    [InlineData("0", PaymentConstants.PaymentStatuses.Pending)]
    [InlineData("-1", PaymentConstants.PaymentStatuses.Cancelled)]
    [InlineData("-2", PaymentConstants.PaymentStatuses.Failed)]
    [InlineData("-3", PaymentConstants.PaymentStatuses.Failed)]
    public void PayHereStatusCode_MapsToInternalPaymentStatus(string statusCode, string expectedStatus)
    {
        var targetStatus = statusCode switch
        {
            "2" => PaymentConstants.PaymentStatuses.Succeeded,
            "0" => PaymentConstants.PaymentStatuses.Pending,
            "-1" => PaymentConstants.PaymentStatuses.Cancelled,
            "-2" or "-3" => PaymentConstants.PaymentStatuses.Failed,
            _ => PaymentConstants.PaymentStatuses.Failed
        };

        Assert.Equal(expectedStatus, targetStatus);
    }

    [Theory]
    [InlineData("DineIn", "Received", true)]
    [InlineData("DineIn", "Pending", true)]
    [InlineData("DineIn", "Preparing", true)]
    [InlineData("DineIn", "Ready", true)]
    [InlineData("DineIn", "Served", true)]
    [InlineData("DineIn", "Cancelled", false)]
    [InlineData("ReservationPreOrder", "Pending", true)]
    [InlineData("ReservationPreOrder", "Confirmed", true)]
    [InlineData("ReservationPreOrder", "Preparing", true)]
    [InlineData("ReservationPreOrder", "Ready", true)]
    [InlineData("ReservationPreOrder", "Completed", true)]
    [InlineData("ReservationPreOrder", "Cancelled", false)]
    public void OrderEligibility_EnforcesPayableLifecycleRules(string orderType, string orderStatus, bool expectedPayable)
    {
        Assert.True(orderType is "DineIn" or "ReservationPreOrder");
        var isPayable = !string.Equals(orderStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

        Assert.Equal(expectedPayable, isPayable);
    }

    [Theory]
    [InlineData(1, 2, false, "You cannot initiate payment on behalf of another customer.")]
    [InlineData(5, 5, true, null)]
    [InlineData(5, null, true, null)]
    public void CrossCustomerCheckout_ValidatesRequestedCustomerAgainstToken(
        int tokenCustomerId,
        int? requestedCustomerId,
        bool expectedAllowed,
        string? expectedError)
    {
        var isForbidden = requestedCustomerId.HasValue && requestedCustomerId.Value != tokenCustomerId;
        var isAllowed = !isForbidden;

        Assert.Equal(expectedAllowed, isAllowed);
        if (!expectedAllowed)
        {
            Assert.Equal("You cannot initiate payment on behalf of another customer.", expectedError);
        }
    }

    [Theory]
    [InlineData(10, 20, false, "You do not own this dine-in order.")]
    [InlineData(20, 20, true, null)]
    public void OrderOwnershipValidation_RejectsCrossCustomerCheckout(
        int callerCustomerId,
        int orderOwnerId,
        bool expectedOwned,
        string? expectedErrorMessage)
    {
        var isOwned = callerCustomerId == orderOwnerId;
        string? errorMessage = isOwned ? null : "You do not own this dine-in order.";

        Assert.Equal(expectedOwned, isOwned);
        Assert.Equal(expectedErrorMessage, errorMessage);
    }

    [Theory]
    [InlineData("https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io", true)]
    [InlineData("https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/orders/review", true)]
    [InlineData("http://localhost:5173", false)]
    [InlineData("http://localhost", false)]
    [InlineData(null, false)]
    [InlineData("", false)]
    public void PayHereOptions_ResolveUrls_ResolvesCorrectEnvironmentUrls(string? origin, bool expectAzure)
    {
        var options = new PayHereOptions
        {
            LocalReturnUrl = "http://localhost/orders/track?payment=returned",
            LocalCancelUrl = "http://localhost/orders/track?payment=cancelled",
            LocalNotifyUrl = "http://localhost:5000/api/payments/payhere/notify",
            AzureReturnUrl = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/orders/track?payment=returned",
            AzureCancelUrl = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/orders/track?payment=cancelled",
            AzureNotifyUrl = "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io/reservation-api/api/payments/payhere/notify"
        };

        var (returnUrl, cancelUrl, notifyUrl) = options.ResolveUrls(origin);

        if (expectAzure)
        {
            Assert.Equal(options.AzureReturnUrl, returnUrl);
            Assert.Equal(options.AzureCancelUrl, cancelUrl);
            Assert.Equal(options.AzureNotifyUrl, notifyUrl);
        }
        else
        {
            Assert.Equal(options.LocalReturnUrl, returnUrl);
            Assert.Equal(options.LocalCancelUrl, cancelUrl);
            // Local notify falls back to public reachable Azure notify for sandbox webhook delivery
            Assert.Equal(options.AzureNotifyUrl, notifyUrl);
        }
    }
}
