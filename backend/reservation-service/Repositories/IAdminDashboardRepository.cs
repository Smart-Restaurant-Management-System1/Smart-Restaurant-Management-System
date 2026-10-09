using ReservationService.DTOs;

namespace ReservationService.Repositories;

/// <summary>
/// Repository contract for retrieving aggregated operational metrics and trends directly from the database (SR-243 / SR-244 / SR-245).
/// </summary>
public interface IAdminDashboardRepository
{
    /// <summary>
    /// Retrieves aggregated customer and staff metrics from the authoritative Identity store (SR-243).
    /// </summary>
    Task<DashboardCustomerStaffMetricsDto> GetCustomerStaffMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves authoritative reservation statistics including active, today's, and date-range totals (SR-243).
    /// </summary>
    Task<DashboardReservationMetricsDto> GetReservationMetricsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves daily reservation trend counts across the given date range (SR-243).
    /// </summary>
    Task<IReadOnlyList<DailyReservationTrendDto>> GetDailyReservationTrendsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves aggregated order and kitchen activity metrics for Dine-In and Pre-Orders across the date range (SR-244).
    /// </summary>
    Task<DashboardOrderMetricsDto> GetOrderMetricsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves culinary dish catalog availability summary and category breakdown (SR-244).
    /// </summary>
    Task<DashboardMenuMetricsDto> GetMenuMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves daily order volume and fulfillment trends across the date range (SR-244).
    /// </summary>
    Task<IReadOnlyList<DailyOrderTrendDto>> GetDailyOrderTrendsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}

