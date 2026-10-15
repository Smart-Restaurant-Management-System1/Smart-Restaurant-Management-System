using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class NotificationServiceTests
{
    private readonly Mock<INotificationRepository> _repositoryMock;
    private readonly Mock<ILogger<NotificationService>> _loggerMock;
    private readonly NotificationService _service;

    public NotificationServiceTests()
    {
        _repositoryMock = new Mock<INotificationRepository>();
        _loggerMock = new Mock<ILogger<NotificationService>>();
        _service = new NotificationService(_repositoryMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetCustomerNotificationsAsync_ClampsPagination()
    {
        _repositoryMock.Setup(r => r.GetCustomerNotificationsAsync(
            1, 1, 10, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<CustomerNotification>(), 0, 0));

        // Call with negative page and 0 page size
        var result = await _service.GetCustomerNotificationsAsync(1, -5, 0, false, CancellationToken.None);

        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        _repositoryMock.Verify(r => r.GetCustomerNotificationsAsync(1, 1, 10, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenNotOwned_ReturnsFalseWithoutUpdating()
    {
        // Notification 10 does not belong to customer 42
        _repositoryMock.Setup(r => r.GetByIdAsync(42, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((CustomerNotification?)null);

        var result = await _service.MarkAsReadAsync(42, 10, CancellationToken.None);

        Assert.False(result);
        _repositoryMock.Verify(r => r.MarkAsReadAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenAlreadyRead_ReturnsTrueIdempotently()
    {
        var notification = new CustomerNotification
        {
            Id = 5,
            CustomerId = 42,
            IsRead = true,
            ReadAt = DateTime.UtcNow
        };

        _repositoryMock.Setup(r => r.GetByIdAsync(42, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(notification);

        var result = await _service.MarkAsReadAsync(42, 5, CancellationToken.None);

        Assert.True(result);
        _repositoryMock.Verify(r => r.MarkAsReadAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenUnread_CallsRepositoryMarkAsRead()
    {
        var notification = new CustomerNotification
        {
            Id = 5,
            CustomerId = 42,
            IsRead = false
        };

        _repositoryMock.Setup(r => r.GetByIdAsync(42, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(notification);

        _repositoryMock.Setup(r => r.MarkAsReadAsync(42, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _service.MarkAsReadAsync(42, 5, CancellationToken.None);

        Assert.True(result);
        _repositoryMock.Verify(r => r.MarkAsReadAsync(42, 5, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateNotificationAsync_WhenRepositoryThrows_CatchesAndReturnsZero_NeverFailsCaller()
    {
        var notification = new CustomerNotification
        {
            CustomerId = 42,
            EventType = NotificationEventTypes.ReservationCreated,
            Title = "Test",
            Message = "Test message"
        };

        _repositoryMock.Setup(r => r.CreateNotificationAsync(
            notification, null, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated database failure"));

        var result = await _service.CreateNotificationAsync(notification, null, null, CancellationToken.None);

        // Crucial acceptance check #4: Notification failure must NEVER cause reservation or order to fail
        Assert.Equal(0, result);
    }
}

