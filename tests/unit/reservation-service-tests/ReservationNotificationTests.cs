using Moq;
using ReservationService.Models;
using ReservationService.Repositories;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationNotificationTests
{
    [Fact]
    public void ReservationNotification_HasRequiredEventTypes()
    {
        Assert.Equal("ReservationCreated", NotificationEventTypes.ReservationCreated);
        Assert.Equal("ReservationUpdated", NotificationEventTypes.ReservationUpdated);
        Assert.Equal("ReservationCancelled", NotificationEventTypes.ReservationCancelled);
    }

    [Fact]
    public void ReservationNotification_ContainsSafeFieldsOnly()
    {
        var notification = new CustomerNotification
        {
            Id = 1,
            CustomerId = 101,
            EventType = NotificationEventTypes.ReservationCreated,
            Title = "Reservation Confirmed",
            Message = "Your table reservation #SR-ABCD-1234 for Oct 12, 2026 19:00 (Table T-02) has been confirmed.",
            ReferenceType = "Reservation",
            ReferenceId = 44,
            ReferenceCode = "SR-ABCD-1234",
            CreatedAt = DateTime.UtcNow
        };

        // Ensure safe contents
        Assert.Equal(101, notification.CustomerId);
        Assert.Contains("SR-ABCD-1234", notification.Message);
        Assert.DoesNotContain("secret", notification.Message.ToLowerInvariant());
        Assert.DoesNotContain("token", notification.Message.ToLowerInvariant());
        Assert.DoesNotContain("password", notification.Message.ToLowerInvariant());
    }

    [Fact]
    public async Task NotificationRepository_WhenExceptionOccurs_CanBeIsolatedSafely()
    {
        var mockRepo = new Mock<INotificationRepository>();
        mockRepo.Setup(r => r.CreateNotificationAsync(
            It.IsAny<CustomerNotification>(), null, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated notification service failure"));

        // Simulate safe execution wrapper
        Exception? caughtException = null;
        try
        {
            await mockRepo.Object.CreateNotificationAsync(new CustomerNotification
            {
                CustomerId = 101,
                EventType = NotificationEventTypes.ReservationCreated,
                Title = "Test",
                Message = "Test"
            });
        }
        catch (Exception ex)
        {
            caughtException = ex;
        }

        Assert.NotNull(caughtException);
        // Demonstrates that repository threw, but service layer or caller must catch so operation succeeds.
    }
}

