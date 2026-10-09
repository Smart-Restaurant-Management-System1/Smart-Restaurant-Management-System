using System.Text.RegularExpressions;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;

namespace ReservationService.Repositories;

/// <summary>
/// Authoritative MySQL repository for admin dashboard metrics and trends (SR-243 / SR-244 / SR-245).
/// </summary>
public class AdminDashboardRepository : IAdminDashboardRepository
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly string _identityDatabaseName;
    private readonly ILogger<AdminDashboardRepository> _logger;

    private static readonly TimeZoneInfo SriLankaTimeZone = ResolveSriLankaTimeZone();

    public AdminDashboardRepository(
        DatabaseHelper databaseHelper,
        IConfiguration configuration,
        ILogger<AdminDashboardRepository> logger)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;

        var rawDbName = configuration["IdentityDb:DatabaseName"]
            ?? configuration["IDENTITY_DB_NAME"]
            ?? "restaurant_identity_db";

        _identityDatabaseName = Regex.Replace(rawDbName, @"[^\w]", "");
        if (string.IsNullOrWhiteSpace(_identityDatabaseName))
        {
            _identityDatabaseName = "restaurant_identity_db";
        }
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

    public async Task<DashboardCustomerStaffMetricsDto> GetCustomerStaffMetricsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
            var sql = $@"
                SELECT
                    COALESCE(SUM(CASE WHEN `Role` = 'Customer' THEN 1 ELSE 0 END), 0) AS TotalCustomers,
                    COALESCE(SUM(CASE WHEN `Role` IN ('Staff', 'KitchenStaff') THEN 1 ELSE 0 END), 0) AS TotalStaff,
                    COALESCE(SUM(CASE WHEN `Role` = 'Customer' AND `Status` = 'Active' AND `DeletedAt` IS NULL THEN 1 ELSE 0 END), 0) AS ActiveCustomers,
                    COALESCE(SUM(CASE WHEN `Role` IN ('Staff', 'KitchenStaff') AND `Status` = 'Active' AND `DeletedAt` IS NULL THEN 1 ELSE 0 END), 0) AS ActiveStaff
                FROM `{_identityDatabaseName}`.`Users`;";

            await using var command = new MySqlCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                return new DashboardCustomerStaffMetricsDto(
                    TotalCustomers: Convert.ToInt32(reader["TotalCustomers"]),
                    TotalStaff: Convert.ToInt32(reader["TotalStaff"]),
                    ActiveCustomers: Convert.ToInt32(reader["ActiveCustomers"]),
                    ActiveStaff: Convert.ToInt32(reader["ActiveStaff"])
                );
            }

            return new DashboardCustomerStaffMetricsDto(0, 0, 0, 0);
        }
        catch (MySqlException ex) when (ex.Number == 1146 || ex.Number == 1049)
        {
            _logger.LogWarning("Identity database/table not found (Error {Code}) during dashboard user metrics retrieval. Returning zero defaults for isolated environment.", ex.Number);
            return new DashboardCustomerStaffMetricsDto(0, 0, 0, 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error retrieving customer/staff metrics for admin dashboard.");
            return new DashboardCustomerStaffMetricsDto(0, 0, 0, 0);
        }
    }

    public async Task<DashboardReservationMetricsDto> GetReservationMetricsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        // 1. Timezone-aligned boundaries in UTC for index seek performance
        var nowUtc = DateTime.UtcNow;
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, SriLankaTimeZone);

        var todayStartLocal = new DateTime(nowLocal.Year, nowLocal.Month, nowLocal.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var todayEndLocal = todayStartLocal.AddDays(1);

        var todayStartUtc = TimeZoneInfo.ConvertTimeToUtc(todayStartLocal, SriLankaTimeZone);
        var todayEndUtc = TimeZoneInfo.ConvertTimeToUtc(todayEndLocal, SriLankaTimeZone);

        var rangeStartUtc = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);
        var rangeEndUtc = TimeZoneInfo.ConvertTimeToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);

        // 2. Active reservations: Pending or Confirmed and end time is in the future
        int activeReservations = 0;
        const string activeSql = @"
            SELECT COUNT(*)
            FROM `Reservations`
            WHERE `Status` IN ('Pending', 'Confirmed') AND `EndDateTime` >= @nowUtc;";

        await using (var cmd = new MySqlCommand(activeSql, connection))
        {
            cmd.Parameters.AddWithValue("@nowUtc", nowUtc);
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result != null && result != DBNull.Value)
            {
                activeReservations = Convert.ToInt32(result);
            }
        }

        // 3. Today's reservations (in Asia/Colombo timezone)
        int todaysReservations = 0;
        const string todaySql = @"
            SELECT COUNT(*)
            FROM `Reservations`
            WHERE `StartDateTime` >= @todayStart AND `StartDateTime` < @todayEnd;";

        await using (var cmd = new MySqlCommand(todaySql, connection))
        {
            cmd.Parameters.AddWithValue("@todayStart", todayStartUtc);
            cmd.Parameters.AddWithValue("@todayEnd", todayEndUtc);
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result != null && result != DBNull.Value)
            {
                todaysReservations = Convert.ToInt32(result);
            }
        }

        // 4. Range-filtered reservation aggregates
        int total = 0;
        int pending = 0;
        int confirmed = 0;
        int cancelled = 0;
        int completed = 0;

        const string rangeSql = @"
            SELECT
                COUNT(*) AS Total,
                COALESCE(SUM(CASE WHEN `Status` = 'Pending' THEN 1 ELSE 0 END), 0) AS Pending,
                COALESCE(SUM(CASE WHEN `Status` = 'Confirmed' THEN 1 ELSE 0 END), 0) AS Confirmed,
                COALESCE(SUM(CASE WHEN `Status` = 'Cancelled' THEN 1 ELSE 0 END), 0) AS Cancelled,
                COALESCE(SUM(CASE WHEN `Status` = 'Completed' THEN 1 ELSE 0 END), 0) AS Completed
            FROM `Reservations`
            WHERE `StartDateTime` >= @rangeStart AND `StartDateTime` < @rangeEnd;";

        await using (var cmd = new MySqlCommand(rangeSql, connection))
        {
            cmd.Parameters.AddWithValue("@rangeStart", rangeStartUtc);
            cmd.Parameters.AddWithValue("@rangeEnd", rangeEndUtc);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                total = Convert.ToInt32(reader["Total"]);
                pending = Convert.ToInt32(reader["Pending"]);
                confirmed = Convert.ToInt32(reader["Confirmed"]);
                cancelled = Convert.ToInt32(reader["Cancelled"]);
                completed = Convert.ToInt32(reader["Completed"]);
            }
        }

        return new DashboardReservationMetricsDto(
            ActiveReservations: activeReservations,
            TodaysReservations: todaysReservations,
            TotalReservations: total,
            PendingReservations: pending,
            ConfirmedReservations: confirmed,
            CancelledReservations: cancelled,
            CompletedReservations: completed
        );
    }

    public async Task<IReadOnlyList<DailyReservationTrendDto>> GetDailyReservationTrendsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var rangeStartUtc = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);
        var rangeEndUtc = TimeZoneInfo.ConvertTimeToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);

        // Group by local calendar date in Asia/Colombo (+05:30)
        const string trendSql = @"
            SELECT
                DATE(CONVERT_TZ(`StartDateTime`, '+00:00', '+05:30')) AS ReservationDate,
                COUNT(*) AS Total,
                COALESCE(SUM(CASE WHEN `Status` = 'Confirmed' THEN 1 ELSE 0 END), 0) AS Confirmed,
                COALESCE(SUM(CASE WHEN `Status` = 'Pending' THEN 1 ELSE 0 END), 0) AS Pending,
                COALESCE(SUM(CASE WHEN `Status` = 'Cancelled' THEN 1 ELSE 0 END), 0) AS Cancelled,
                COALESCE(SUM(CASE WHEN `Status` = 'Completed' THEN 1 ELSE 0 END), 0) AS Completed
            FROM `Reservations`
            WHERE `StartDateTime` >= @rangeStart AND `StartDateTime` < @rangeEnd
            GROUP BY ReservationDate
            ORDER BY ReservationDate ASC;";

        var dateMap = new Dictionary<DateOnly, (int Total, int Confirmed, int Pending, int Cancelled, int Completed)>();

        await using (var cmd = new MySqlCommand(trendSql, connection))
        {
            cmd.Parameters.AddWithValue("@rangeStart", rangeStartUtc);
            cmd.Parameters.AddWithValue("@rangeEnd", rangeEndUtc);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (!reader.IsDBNull(reader.GetOrdinal("ReservationDate")))
                {
                    var dt = reader.GetDateTime(reader.GetOrdinal("ReservationDate"));
                    var d = DateOnly.FromDateTime(dt);
                    dateMap[d] = (
                        Convert.ToInt32(reader["Total"]),
                        Convert.ToInt32(reader["Confirmed"]),
                        Convert.ToInt32(reader["Pending"]),
                        Convert.ToInt32(reader["Cancelled"]),
                        Convert.ToInt32(reader["Completed"])
                    );
                }
            }
        }

        // Generate complete continuous series for every date in range
        var resultList = new List<DailyReservationTrendDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (dateMap.TryGetValue(d, out var counts))
            {
                resultList.Add(new DailyReservationTrendDto(d, counts.Total, counts.Confirmed, counts.Pending, counts.Cancelled, counts.Completed));
            }
            else
            {
                resultList.Add(new DailyReservationTrendDto(d, 0, 0, 0, 0, 0));
            }
        }

        return resultList;
    }

    public async Task<DashboardOrderMetricsDto> GetOrderMetricsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var rangeStartUtc = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);
        var rangeEndUtc = TimeZoneInfo.ConvertTimeToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);

        const string orderMetricsSql = @"
            SELECT
                COUNT(*) AS TotalOrders,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Pending' THEN 1 ELSE 0 END), 0) AS PendingOrders,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Preparing' THEN 1 ELSE 0 END), 0) AS PreparingOrders,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Ready' THEN 1 ELSE 0 END), 0) AS ReadyOrders,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Served' THEN 1 ELSE 0 END), 0) AS ServedOrders,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Cancelled' THEN 1 ELSE 0 END), 0) AS CancelledOrders,
                COALESCE(SUM(CASE WHEN OrderType = 'DineIn' THEN 1 ELSE 0 END), 0) AS TotalDineIn,
                COALESCE(SUM(CASE WHEN OrderType = 'PreOrder' THEN 1 ELSE 0 END), 0) AS TotalPreOrders
            FROM (
                SELECT
                    'DineIn' AS OrderType,
                    CASE
                        WHEN `Status` = 'Received' THEN 'Pending'
                        ELSE `Status`
                    END AS NormalizedStatus
                FROM `DineInOrders`
                WHERE `CreatedAt` >= @rangeStart AND `CreatedAt` < @rangeEnd

                UNION ALL

                SELECT
                    'PreOrder' AS OrderType,
                    CASE
                        WHEN `Status` IN ('Pending', 'Confirmed') THEN 'Pending'
                        WHEN `Status` = 'Completed' THEN 'Served'
                        ELSE `Status`
                    END AS NormalizedStatus
                FROM `ReservationPreOrders`
                WHERE `CreatedAt` >= @rangeStart AND `CreatedAt` < @rangeEnd
            ) AS AllOrders;";

        await using var cmd = new MySqlCommand(orderMetricsSql, connection);
        cmd.Parameters.AddWithValue("@rangeStart", rangeStartUtc);
        cmd.Parameters.AddWithValue("@rangeEnd", rangeEndUtc);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return new DashboardOrderMetricsDto(
                TotalOrders: Convert.ToInt32(reader["TotalOrders"]),
                PendingOrders: Convert.ToInt32(reader["PendingOrders"]),
                PreparingOrders: Convert.ToInt32(reader["PreparingOrders"]),
                ReadyOrders: Convert.ToInt32(reader["ReadyOrders"]),
                ServedOrders: Convert.ToInt32(reader["ServedOrders"]),
                CancelledOrders: Convert.ToInt32(reader["CancelledOrders"]),
                TotalDineInOrders: Convert.ToInt32(reader["TotalDineIn"]),
                TotalPreOrders: Convert.ToInt32(reader["TotalPreOrders"])
            );
        }

        return new DashboardOrderMetricsDto(0, 0, 0, 0, 0, 0, 0, 0);
    }

    public async Task<DashboardMenuMetricsDto> GetMenuMetricsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        const string menuSql = @"
            SELECT
                `Category`,
                COUNT(*) AS Total,
                COALESCE(SUM(CASE WHEN `IsAvailable` = 1 THEN 1 ELSE 0 END), 0) AS Available,
                COALESCE(SUM(CASE WHEN `IsAvailable` = 0 THEN 1 ELSE 0 END), 0) AS Unavailable
            FROM `MenuItems`
            GROUP BY `Category`
            ORDER BY `Category` ASC;";

        var categories = new List<CategoryMenuAvailabilityDto>();
        int totalItems = 0;
        int availableItems = 0;
        int unavailableItems = 0;

        await using var cmd = new MySqlCommand(menuSql, connection);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var cat = reader.GetString("Category");
            var tot = Convert.ToInt32(reader["Total"]);
            var avail = Convert.ToInt32(reader["Available"]);
            var unavail = Convert.ToInt32(reader["Unavailable"]);

            categories.Add(new CategoryMenuAvailabilityDto(cat, tot, avail, unavail));

            totalItems += tot;
            availableItems += avail;
            unavailableItems += unavail;
        }

        return new DashboardMenuMetricsDto(
            TotalMenuItems: totalItems,
            AvailableMenuItems: availableItems,
            UnavailableMenuItems: unavailableItems,
            Categories: categories
        );
    }

    public async Task<IReadOnlyList<DailyOrderTrendDto>> GetDailyOrderTrendsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var rangeStartUtc = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);
        var rangeEndUtc = TimeZoneInfo.ConvertTimeToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue), SriLankaTimeZone);

        const string trendSql = @"
            SELECT
                OrderDate,
                COUNT(*) AS Total,
                COALESCE(SUM(CASE WHEN OrderType = 'DineIn' THEN 1 ELSE 0 END), 0) AS DineIn,
                COALESCE(SUM(CASE WHEN OrderType = 'PreOrder' THEN 1 ELSE 0 END), 0) AS PreOrder,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Served' THEN 1 ELSE 0 END), 0) AS Served,
                COALESCE(SUM(CASE WHEN NormalizedStatus = 'Cancelled' THEN 1 ELSE 0 END), 0) AS Cancelled
            FROM (
                SELECT
                    DATE(CONVERT_TZ(`CreatedAt`, '+00:00', '+05:30')) AS OrderDate,
                    'DineIn' AS OrderType,
                    CASE
                        WHEN `Status` = 'Received' THEN 'Pending'
                        ELSE `Status`
                    END AS NormalizedStatus
                FROM `DineInOrders`
                WHERE `CreatedAt` >= @rangeStart AND `CreatedAt` < @rangeEnd

                UNION ALL

                SELECT
                    DATE(CONVERT_TZ(`CreatedAt`, '+00:00', '+05:30')) AS OrderDate,
                    'PreOrder' AS OrderType,
                    CASE
                        WHEN `Status` IN ('Pending', 'Confirmed') THEN 'Pending'
                        WHEN `Status` = 'Completed' THEN 'Served'
                        ELSE `Status`
                    END AS NormalizedStatus
                FROM `ReservationPreOrders`
                WHERE `CreatedAt` >= @rangeStart AND `CreatedAt` < @rangeEnd
            ) AS AllDailyOrders
            GROUP BY OrderDate
            ORDER BY OrderDate ASC;";

        var dateMap = new Dictionary<DateOnly, (int Total, int DineIn, int PreOrder, int Served, int Cancelled)>();

        await using var cmd = new MySqlCommand(trendSql, connection);
        cmd.Parameters.AddWithValue("@rangeStart", rangeStartUtc);
        cmd.Parameters.AddWithValue("@rangeEnd", rangeEndUtc);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (!reader.IsDBNull(reader.GetOrdinal("OrderDate")))
            {
                var dt = reader.GetDateTime(reader.GetOrdinal("OrderDate"));
                var d = DateOnly.FromDateTime(dt);
                dateMap[d] = (
                    Convert.ToInt32(reader["Total"]),
                    Convert.ToInt32(reader["DineIn"]),
                    Convert.ToInt32(reader["PreOrder"]),
                    Convert.ToInt32(reader["Served"]),
                    Convert.ToInt32(reader["Cancelled"])
                );
            }
        }

        var resultList = new List<DailyOrderTrendDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (dateMap.TryGetValue(d, out var counts))
            {
                resultList.Add(new DailyOrderTrendDto(d, counts.Total, counts.DineIn, counts.PreOrder, counts.Served, counts.Cancelled));
            }
            else
            {
                resultList.Add(new DailyOrderTrendDto(d, 0, 0, 0, 0, 0));
            }
        }

        return resultList;
    }
}

