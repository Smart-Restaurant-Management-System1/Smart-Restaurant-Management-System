using ReservationService.DTOs;

namespace ReservationService.Services;

/// <summary>
/// Business service contract for Admin Operational Dashboard metrics, aggregations and trend charts (SR-243 / SR-244 / SR-245).
/// </summary>
public interface IAdminDashboardService
{
    /// <summary>
    /// Validates and resolves incoming date range queries, enforcing range limits and defaults.
    /// </summary>
    (DateOnly From, DateOnly To, string? Error) ValidateAndResolveDateRange(DateOnly? from, DateOnly? to);

    /// <summary>
    /// Retrieves aggregated user metrics, authoritative reservation metrics, and daily trends for the resolved date range (SR-243).
    /// </summary>
    Task<DashboardReservationsSummaryDto> GetReservationsSummaryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves aggregated order metrics, menu availability breakdown, and daily order trends for the resolved date range (SR-244).
    /// </summary>
    Task<DashboardOrdersSummaryDto> GetOrdersSummaryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a unified operational dashboard overview combining all metrics and trends in a single request (SR-245).
    /// </summary>
    Task<DashboardOverviewResponseDto> GetDashboardOverviewAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}

