namespace ReservationService.Events;

public static class OrderLifecycleEventTypes
{
    public const string OrderCreated = "OrderCreated";
    public const string OrderPreparing = "OrderPreparing";
    public const string OrderReady = "OrderReady";
    public const string OrderServed = "OrderServed";
    public const string OrderCancelled = "OrderCancelled";
}
