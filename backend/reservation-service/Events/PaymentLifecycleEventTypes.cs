namespace ReservationService.Events;

public static class PaymentLifecycleEventTypes
{
    public const string PaymentPending = "PaymentPending";
    public const string PaymentSucceeded = "PaymentSucceeded";
    public const string PaymentFailed = "PaymentFailed";
    public const string PaymentCancelled = "PaymentCancelled";
}
