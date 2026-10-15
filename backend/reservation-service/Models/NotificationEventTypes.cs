namespace ReservationService.Models;

public static class NotificationEventTypes
{
    public const string ReservationCreated = "ReservationCreated";
    public const string ReservationUpdated = "ReservationUpdated";
    public const string ReservationCancelled = "ReservationCancelled";

    public const string OrderCreated = "OrderCreated";
    public const string OrderPreparing = "OrderPreparing";
    public const string OrderReady = "OrderReady";
    public const string OrderServed = "OrderServed";
    public const string OrderCancelled = "OrderCancelled";

    public const string PaymentSucceeded = "PaymentSucceeded";
    public const string PaymentFailed = "PaymentFailed";
}

