using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Services;

public interface INotificationService
{
    Task<NotificationListResponseDto> GetCustomerNotificationsAsync(
        int customerId,
        int page,
        int pageSize,
        bool unreadOnly,
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

    Task<int> CreateNotificationAsync(
        CustomerNotification notification,
        MySqlConnection? existingConnection = null,
        MySqlTransaction? existingTransaction = null,
        CancellationToken cancellationToken = default);
}

