using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ReservationService.DTOs;

public sealed class PaymentCheckoutRequest
{
    [Required]
    public string OrderType { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int OrderId { get; set; }
}

public sealed class PayHereCheckoutResponse
{
    public int PaymentId { get; set; }
    public string MerchantId { get; set; } = string.Empty;
    public string MerchantOrderReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string Hash { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string NotifyUrl { get; set; } = string.Empty;
    public string ReturnUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string OrderType { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string? CustomerFirstName { get; set; }
    public string? CustomerLastName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
}

public sealed class CashPaymentRequest
{
    [Required]
    public string OrderType { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int OrderId { get; set; }

    [MaxLength(500)]
    public string? CustomerNotes { get; set; }
}

public sealed class BankTransferPaymentFormRequest
{
    [Required]
    public string OrderType { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int OrderId { get; set; }

    [MaxLength(64)]
    public string? DepositReference { get; set; }

    [MaxLength(500)]
    public string? CustomerNotes { get; set; }

    [Required]
    public IFormFile SlipFile { get; set; } = null!;
}

public sealed class PaymentStatusResponse
{
    public int PaymentId { get; set; }
    public int CustomerId { get; set; }
    public string OrderType { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string Status { get; set; } = string.Empty;
    public string MerchantOrderReference { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
    public string? SlipUrl { get; set; }
    public string? CustomerNotes { get; set; }
    public int? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class VerifyPaymentRequest
{
    [Required]
    public string Action { get; set; } = "Approve"; // "Approve" | "Reject"

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public sealed class PayHereNotifyForm
{
    public string? merchant_id { get; set; }
    public string? order_id { get; set; }
    public string? payment_id { get; set; }
    public string? payhere_amount { get; set; }
    public string? payhere_currency { get; set; }
    public string? status_code { get; set; }
    public string? md5sig { get; set; }
    public string? custom_1 { get; set; }
    public string? custom_2 { get; set; }
    public string? method { get; set; }
    public string? status_message { get; set; }
}
