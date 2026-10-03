namespace ReservationService.Models;

public static class PaymentConstants
{
    public static class PaymentMethods
    {
        public const string PayHere = "PayHere";
        public const string Cash = "Cash";
        public const string BankTransfer = "BankTransfer";
    }

    public static class PaymentStatuses
    {
        public const string Pending = "Pending";
        public const string Succeeded = "Succeeded";
        public const string Failed = "Failed";
        public const string Cancelled = "Cancelled";
    }

    public static class OrderTypes
    {
        public const string DineIn = "DineIn";
        public const string ReservationPreOrder = "ReservationPreOrder";
    }
}
