namespace ReservationService.DTOs;

/// <summary>
/// Aggregated user metrics for Customer and Staff accounts (SR-243).
/// </summary>
public sealed record DashboardCustomerStaffMetricsDto(
    int TotalCustomers,
    int TotalStaff,
    int ActiveCustomers,
    int ActiveStaff
);

/// <summary>
/// Authoritative reservation metrics for active, today's, and date-range totals (SR-243).
/// </summary>
public sealed record DashboardReservationMetricsDto(
    int ActiveReservations,
    int TodaysReservations,
    int TotalReservations,
    int PendingReservations,
    int ConfirmedReservations,
    int CancelledReservations,
    int CompletedReservations
);

/// <summary>
/// Daily breakdown of reservation volume for timeline trends (SR-243).
/// </summary>
public sealed record DailyReservationTrendDto(
    DateOnly Date,
    int Total,
    int Confirmed,
    int Pending,
    int Cancelled,
    int Completed
);

/// <summary>
/// Combined customer, staff and reservation operational summary (SR-243).
/// </summary>
public sealed record DashboardReservationsSummaryDto(
    DashboardCustomerStaffMetricsDto Users,
    DashboardReservationMetricsDto Reservations,
    IReadOnlyList<DailyReservationTrendDto> DailyTrends,
    DateOnly From,
    DateOnly To
);

/// <summary>
/// Authoritative metrics for combined Dine-In and Pre-Order kitchen pipeline activity (SR-244).
/// </summary>
public sealed record DashboardOrderMetricsDto(
    int TotalOrders,
    int PendingOrders,
    int PreparingOrders,
    int ReadyOrders,
    int ServedOrders,
    int CancelledOrders,
    int TotalDineInOrders,
    int TotalPreOrders
);

/// <summary>
/// Category-level menu availability breakdown (SR-244).
/// </summary>
public sealed record CategoryMenuAvailabilityDto(
    string Category,
    int Total,
    int Available,
    int Unavailable
);

/// <summary>
/// Culinary dish catalog availability metrics (SR-244).
/// </summary>
public sealed record DashboardMenuMetricsDto(
    int TotalMenuItems,
    int AvailableMenuItems,
    int UnavailableMenuItems,
    IReadOnlyList<CategoryMenuAvailabilityDto> Categories
);

/// <summary>
/// Daily breakdown of order volume and fulfillment trends (SR-244).
/// </summary>
public sealed record DailyOrderTrendDto(
    DateOnly Date,
    int Total,
    int DineIn,
    int PreOrder,
    int Served,
    int Cancelled
);

/// <summary>
/// Combined order and kitchen activity operational summary (SR-244).
/// </summary>
public sealed record DashboardOrdersSummaryDto(
    DashboardOrderMetricsDto Orders,
    DashboardMenuMetricsDto Menu,
    IReadOnlyList<DailyOrderTrendDto> DailyTrends,
    DateOnly From,
    DateOnly To
);

/// <summary>
/// Unified operational dashboard overview response combining user metrics, reservations, orders, menu availability, and trends (SR-245).
/// Enables single-request dashboard loading.
/// </summary>
public sealed record DashboardOverviewResponseDto(
    DashboardCustomerStaffMetricsDto Users,
    DashboardReservationMetricsDto Reservations,
    DashboardOrderMetricsDto Orders,
    DashboardMenuMetricsDto Menu,
    IReadOnlyList<DailyReservationTrendDto> ReservationTrends,
    IReadOnlyList<DailyOrderTrendDto> OrderTrends,
    DateOnly From,
    DateOnly To,
    DateTime GeneratedAtUtc
);

/// <summary>
/// Query filter for admin operational dashboard endpoints (SR-243 / SR-244 / SR-245).
/// </summary>
public sealed class DashboardQueryDto
{
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

