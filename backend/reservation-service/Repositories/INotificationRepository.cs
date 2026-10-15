using MySqlConnector;
using ReservationService.Models;

namespace ReservationService.Repositories;

public interface INotificationRepository
{
    Task<int> CreateNotificationAsync(
        CustomerNotification notification,
        MySqlConnection? existingConnection = null,
        MySqlTransaction? existingTransaction = null,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<CustomerNotification> Items, int TotalCount, int UnreadCount)> GetCustomerNotificationsAsync(
        int customerId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default);

    Task<CustomerNotification?> GetByIdAsync(
        int customerId,
        int notificationId,
        CancellationToken cancellationToken = default);

    Task<bool> MarkAsReadAsync(
        int customerId,
        int notificationId,
        CancellationToken cancellationToken = default);

    Task<int> MarkAllAsReadAsync(
        int customerId,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(
        int customerId,
        CancellationToken cancellationToken = default);
}

