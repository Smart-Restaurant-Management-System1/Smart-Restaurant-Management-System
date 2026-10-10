using ReservationService.DTOs;
using ReservationService.Repositories;

namespace ReservationService.Services;

/// <summary>
/// Service implementation coordinating admin operational metrics, query validation and trend aggregations (SR-243 / SR-244 / SR-245).
/// </summary>
public class AdminDashboardService : IAdminDashboardService
{
    private readonly IAdminDashboardRepository _dashboardRepository;
    private readonly ILogger<AdminDashboardService> _logger;

    private static readonly TimeZoneInfo SriLankaTimeZone = ResolveSriLankaTimeZone();

    public AdminDashboardService(
        IAdminDashboardRepository dashboardRepository,
        ILogger<AdminDashboardService> logger)
    {
        _dashboardRepository = dashboardRepository;
        _logger = logger;
    }

    private static TimeZoneInfo ResolveSriLankaTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Sri Lanka Standard Time"); }
        catch
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo"); }
            catch
            {
                return TimeZoneInfo.CreateCustomTimeZone("SLST", TimeSpan.FromHours(5.5), "Sri Lanka Standard Time", "Sri Lanka Standard Time");
            }
        }
    }

    public (DateOnly From, DateOnly To, string? Error) ValidateAndResolveDateRange(DateOnly? from, DateOnly? to)
    {
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SriLankaTimeZone);
        var today = DateOnly.FromDateTime(nowLocal);

        var resolvedTo = to ?? today;
        var resolvedFrom = from ?? resolvedTo.AddDays(-6); // 7-day default

        if (resolvedFrom > resolvedTo)
        {
            return (resolvedFrom, resolvedTo, "From date must not be later than To date.");
        }

        if (resolvedTo.DayNumber - resolvedFrom.DayNumber > 90)
        {
            return (resolvedFrom, resolvedTo, "Date range cannot exceed 90 days.");
        }

        return (resolvedFrom, resolvedTo, null);
    }

    public async Task<DashboardReservationsSummaryDto> GetReservationsSummaryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Retrieving admin reservation dashboard summary for range {From} to {To}.", from, to);

        var usersTask = _dashboardRepository.GetCustomerStaffMetricsAsync(cancellationToken);
        var reservationsTask = _dashboardRepository.GetReservationMetricsAsync(from, to, cancellationToken);
        var trendsTask = _dashboardRepository.GetDailyReservationTrendsAsync(from, to, cancellationToken);

        await Task.WhenAll(usersTask, reservationsTask, trendsTask);

        return new DashboardReservationsSummaryDto(
            Users: await usersTask,
            Reservations: await reservationsTask,
            DailyTrends: await trendsTask,
            From: from,
            To: to
        );
    }

    public async Task<DashboardOrdersSummaryDto> GetOrdersSummaryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Retrieving admin order & kitchen dashboard summary for range {From} to {To}.", from, to);

        var ordersTask = _dashboardRepository.GetOrderMetricsAsync(from, to, cancellationToken);
        var menuTask = _dashboardRepository.GetMenuMetricsAsync(cancellationToken);
        var trendsTask = _dashboardRepository.GetDailyOrderTrendsAsync(from, to, cancellationToken);

        await Task.WhenAll(ordersTask, menuTask, trendsTask);

        return new DashboardOrdersSummaryDto(
            Orders: await ordersTask,
            Menu: await menuTask,
            DailyTrends: await trendsTask,
            From: from,
            To: to
        );
    }

    public async Task<DashboardOverviewResponseDto> GetDashboardOverviewAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Retrieving unified admin dashboard overview for range {From} to {To}.", from, to);

        var usersTask = _dashboardRepository.GetCustomerStaffMetricsAsync(cancellationToken);
        var reservationsTask = _dashboardRepository.GetReservationMetricsAsync(from, to, cancellationToken);
        var resTrendsTask = _dashboardRepository.GetDailyReservationTrendsAsync(from, to, cancellationToken);
        var ordersTask = _dashboardRepository.GetOrderMetricsAsync(from, to, cancellationToken);
        var menuTask = _dashboardRepository.GetMenuMetricsAsync(cancellationToken);
        var orderTrendsTask = _dashboardRepository.GetDailyOrderTrendsAsync(from, to, cancellationToken);

        await Task.WhenAll(usersTask, reservationsTask, resTrendsTask, ordersTask, menuTask, orderTrendsTask);

        return new DashboardOverviewResponseDto(
            Users: await usersTask,
            Reservations: await reservationsTask,
            Orders: await ordersTask,
            Menu: await menuTask,
            ReservationTrends: await resTrendsTask,
            OrderTrends: await orderTrendsTask,
            From: from,
            To: to,
            GeneratedAtUtc: DateTime.UtcNow
        );
    }
}

