using MySqlConnector;
using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IPaymentRepository
{
    Task<int> CreatePaymentAsync(
        Payment payment,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default);

    Task<Payment?> GetPaymentByIdAsync(
        int paymentId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Payment?> GetPaymentByMerchantReferenceAsync(
        string merchantRef,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Payment?> GetLatestPaymentForOrderAsync(
        string orderType,
        int orderId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Payment?> GetSuccessfulPaymentForOrderAsync(
        string orderType,
        int orderId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<bool> UpdatePaymentStatusAsync(
        int paymentId,
        string status,
        string? providerPaymentId,
        int? verifiedBy,
        DateTime? verifiedAt,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default);

    Task<bool> HasNotificationBeenProcessedAsync(
        string provider,
        string providerPaymentId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<int> RecordNotificationEventAsync(
        PaymentNotificationEvent notificationEvent,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Payment>> GetPendingVerificationsAsync(
        MySqlConnection connection,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Payment>> GetPaymentHistoryAsync(
        string? status,
        int limit,
        MySqlConnection connection,
        CancellationToken cancellationToken = default);
}
