using ReservationService.DTOs;

namespace ReservationService.Services;

public interface IPaymentService
{
    Task<PayHereCheckoutResponse> CreatePayHereCheckoutAsync(
        int customerId,
        PaymentCheckoutRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentStatusResponse> RequestCashPaymentAsync(
        int customerId,
        CashPaymentRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentStatusResponse> SubmitBankTransferSlipAsync(
        int customerId,
        BankTransferPaymentFormRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> ProcessPayHereNotificationAsync(
        PayHereNotifyForm form,
        CancellationToken cancellationToken = default);

    Task<PaymentStatusResponse?> GetPaymentStatusForOrderAsync(
        int customerId,
        string orderType,
        int orderId,
        bool isStaff,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaymentStatusResponse>> GetPendingVerificationsAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaymentStatusResponse>> GetPaymentHistoryAsync(
        string? status,
        int limit,
        CancellationToken cancellationToken = default);

    Task<PaymentStatusResponse> VerifyPaymentAsync(
        int staffUserId,
        int paymentId,
        VerifyPaymentRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentStatusResponse> SimulatePayHereSuccessAsync(
        int customerId,
        PaymentCheckoutRequest request,
        CancellationToken cancellationToken = default);
}
