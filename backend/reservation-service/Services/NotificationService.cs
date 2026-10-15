using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        INotificationRepository repository,
        ILogger<NotificationService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<NotificationListResponseDto> GetCustomerNotificationsAsync(
        int customerId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default)
    {
        var clampedPage = page < 1 ? 1 : page;
        var clampedPageSize = pageSize < 1 ? 10 : (pageSize > 50 ? 50 : pageSize);

        var (items, totalCount, unreadCount) = await _repository.GetCustomerNotificationsAsync(
            customerId,
            clampedPage,
            clampedPageSize,
            unreadOnly,
            cancellationToken);

        var dtos = items.Select(n => new NotificationResponseDto(
            n.Id,
            n.EventType,
            n.Title,
            n.Message,
            n.ReferenceType,
            n.ReferenceId,
            n.ReferenceCode,
            n.IsRead,
            n.ReadAt,
            n.CreatedAt
        )).ToList();

        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / clampedPageSize);

        return new NotificationListResponseDto(
            dtos,
            totalCount,
            unreadCount,
            clampedPage,
            clampedPageSize,
            totalPages
        );
    }

    public async Task<bool> MarkAsReadAsync(
        int customerId,
        int notificationId,
        CancellationToken cancellationToken = default)
    {
        // First verify notification existence and ownership
        var existing = await _repository.GetByIdAsync(customerId, notificationId, cancellationToken);
        if (existing is null)
        {
            return false;
        }

        if (existing.IsRead)
        {
            return true; // Idempotently already read
        }

        return await _repository.MarkAsReadAsync(customerId, notificationId, cancellationToken);
    }

    public Task<int> MarkAllAsReadAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        return _repository.MarkAllAsReadAsync(customerId, cancellationToken);
    }

    public Task<int> GetUnreadCountAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        return _repository.GetUnreadCountAsync(customerId, cancellationToken);
    }

    public async Task<int> CreateNotificationAsync(
        CustomerNotification notification,
        MySqlConnection? existingConnection = null,
        MySqlTransaction? existingTransaction = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _repository.CreateNotificationAsync(
                notification,
                existingConnection,
                existingTransaction,
                cancellationToken);
        }
        catch (Exception ex)
        {
            // CRITICAL HARD RULE: A notification failure must NEVER break the reservation or order operation.
            _logger.LogError(ex, "Failed to create customer notification for CustomerId {CustomerId}, EventType {EventType}.",
                notification.CustomerId, notification.EventType);
            return 0;
        }
    }
}

