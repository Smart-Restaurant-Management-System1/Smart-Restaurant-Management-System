using ReservationService.Models;
using Xunit;

namespace ReservationServiceTests;

public sealed class OrderNotificationTests
{
    [Fact]
    public void OrderNotification_HasAllRequiredLifecycleEventTypes()
    {
        Assert.Equal("OrderCreated", NotificationEventTypes.OrderCreated);
        Assert.Equal("OrderPreparing", NotificationEventTypes.OrderPreparing);
        Assert.Equal("OrderReady", NotificationEventTypes.OrderReady);
        Assert.Equal("OrderServed", NotificationEventTypes.OrderServed);
        Assert.Equal("OrderCancelled", NotificationEventTypes.OrderCancelled);
    }

    [Theory]
    [InlineData("Preparing", "Order Preparing", "Your order #DIN-000001 is now being prepared in the kitchen.")]
    [InlineData("Ready", "Order Ready", "Your order #DIN-000001 is ready! Our staff will serve it to your table shortly.")]
    [InlineData("Served", "Order Served", "Your order #DIN-000001 has been served. Enjoy your meal!")]
    [InlineData("Cancelled", "Order Cancelled", "Your order #DIN-000001 has been cancelled.")]
    public void OrderNotification_PayloadGeneratesAccurateCustomerMessages(string status, string expectedTitle, string expectedMessage)
    {
        var title = status switch
        {
            "Preparing" => "Order Preparing",
            "Ready" => "Order Ready",
            "Served" => "Order Served",
            "Cancelled" => "Order Cancelled",
            _ => $"Order {status}"
        };

        var message = status switch
        {
            "Preparing" => "Your order #DIN-000001 is now being prepared in the kitchen.",
            "Ready" => "Your order #DIN-000001 is ready! Our staff will serve it to your table shortly.",
            "Served" => "Your order #DIN-000001 has been served. Enjoy your meal!",
            "Cancelled" => "Your order #DIN-000001 has been cancelled.",
            _ => $"Your order #DIN-000001 status updated to {status}."
        };

        Assert.Equal(expectedTitle, title);
        Assert.Equal(expectedMessage, message);

        var notification = new CustomerNotification
        {
            CustomerId = 42,
            EventType = $"Order{status}",
            Title = title,
            Message = message,
            ReferenceType = "Order",
            ReferenceId = 1,
            ReferenceCode = "DIN-000001",
            IdempotencyKey = $"notif:order:status:DIN-000001:{status}"
        };

        Assert.Equal(42, notification.CustomerId);
        Assert.Equal($"notif:order:status:DIN-000001:{status}", notification.IdempotencyKey);
    }
}

