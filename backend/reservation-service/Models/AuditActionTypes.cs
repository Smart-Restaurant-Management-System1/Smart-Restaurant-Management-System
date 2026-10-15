namespace ReservationService.Models;

/// <summary>
/// Authoritative constant action types, target types, and results for Admin Audit Logging (SR-223 / SR-250).
/// </summary>
public static class AuditActionTypes
{
    // User Management Actions (SR-218 / SR-251)
    public const string UserBlocked = "USER_BLOCKED";
    public const string UserUnblocked = "USER_UNBLOCKED";
    public const string UserDeleted = "USER_DELETED";
    public const string UserStatusChangeDenied = "USER_STATUS_CHANGE_DENIED";
    public const string UserDeleteDenied = "USER_DELETE_DENIED";

    // Menu Management Actions (SR-130 / SR-252)
    public const string MenuItemCreated = "MENU_ITEM_CREATED";
    public const string MenuItemUpdated = "MENU_ITEM_UPDATED";
    public const string MenuAvailabilityChanged = "MENU_AVAILABILITY_CHANGED";
    public const string MenuItemDeleted = "MENU_ITEM_DELETED";

    // Reservation Management Actions (SR-59 / SR-61 / SR-252)
    public const string ReservationStatusChanged = "RESERVATION_STATUS_CHANGED";
    public const string ReservationRescheduled = "RESERVATION_RESCHEDULED";

    // Table Management Actions (SR-11 / SR-12 / SR-252)
    public const string TableCreated = "TABLE_CREATED";
    public const string TableUpdated = "TABLE_UPDATED";
    public const string TableDeleted = "TABLE_DELETED";

    // Payment Verification Actions (SR-280 / SR-291 extensible)
    public const string PaymentVerified = "PAYMENT_VERIFIED";
    public const string PaymentRejected = "PAYMENT_REJECTED";

    // Target Types
    public static class Targets
    {
        public const string User = "User";
        public const string MenuItem = "MenuItem";
        public const string Reservation = "Reservation";
        public const string Table = "Table";
        public const string Payment = "Payment";
    }

    // Results
    public static class Results
    {
        public const string Success = "Success";
        public const string Denied = "Denied";
        public const string Failed = "Failed";
    }

    // Originating Services
    public static class Services
    {
        public const string IdentityService = "IdentityService";
        public const string ReservationService = "ReservationService";
    }
}

