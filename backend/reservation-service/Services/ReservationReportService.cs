using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Services;

public sealed class ReservationReportService : IReservationReportService
{
    private readonly DatabaseHelper _db;

    public ReservationReportService(DatabaseHelper db)
    {
        _db = db;
    }

    public async Task<ReservationReportDto> GetAsync(DateOnly from, DateOnly to, CancellationToken token = default)
    {
        await using var connection = await _db.CreateConnectionAsync(token);

        var startDateTime = from.ToDateTime(TimeOnly.MinValue);
        var endDateTime = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

        void AddDateParameters(MySqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@s", startDateTime);
            cmd.Parameters.AddWithValue("@e", endDateTime);
        }

        // 1. Aggregated Summary
        const string summarySql = @"
            SELECT 
                COUNT(*),
                COALESCE(SUM(Status = 'Confirmed'), 0),
                COALESCE(SUM(Status = 'Pending'), 0),
                COALESCE(SUM(Status = 'Cancelled'), 0),
                COALESCE(SUM(Status = 'Completed'), 0),
                COALESCE(AVG(GuestCount), 0)
            FROM Reservations
            WHERE StartDateTime >= @s AND StartDateTime < @e;";

        int total = 0;
        int confirmed = 0;
        int pending = 0;
        int cancelled = 0;
        int completed = 0;
        double avgPartySize = 0;

        await using (var cmd = new MySqlCommand(summarySql, connection))
        {
            AddDateParameters(cmd);
            await using var reader = await cmd.ExecuteReaderAsync(token);
            if (await reader.ReadAsync(token))
            {
                total = Convert.ToInt32(reader.GetInt64(0));
                confirmed = Convert.ToInt32(reader.GetDecimal(1));
                pending = Convert.ToInt32(reader.GetDecimal(2));
                cancelled = Convert.ToInt32(reader.GetDecimal(3));
                completed = Convert.ToInt32(reader.GetDecimal(4));
                avgPartySize = Convert.ToDouble(reader.GetDecimal(5));
            }
        }

        // Most requested table (by reservations with Status IN ('Pending', 'Confirmed', 'Completed'))
        const string mostRequestedTableSql = @"
            SELECT t.Id, t.TableNumber, COUNT(r.Id) as Cnt
            FROM RestaurantTables t
            INNER JOIN Reservations r ON r.TableId = t.Id AND r.StartDateTime >= @s AND r.StartDateTime < @e
            WHERE r.Status IN ('Pending', 'Confirmed', 'Completed')
            GROUP BY t.Id, t.TableNumber
            ORDER BY Cnt DESC, t.TableNumber ASC
            LIMIT 1;";

        int? mostRequestedTableId = null;
        string? mostRequestedTableNumber = null;

        await using (var cmd = new MySqlCommand(mostRequestedTableSql, connection))
        {
            AddDateParameters(cmd);
            await using var reader = await cmd.ExecuteReaderAsync(token);
            if (await reader.ReadAsync(token))
            {
                mostRequestedTableId = reader.GetInt32(0);
                mostRequestedTableNumber = reader.GetString(1);
            }
        }

        double cancellationRate = total == 0 ? 0 : Math.Round((double)cancelled / total * 100d, 2);
        var summaryDto = new ReservationReportSummaryDto(
            total,
            confirmed,
            pending,
            cancelled,
            completed,
            cancellationRate,
            Math.Round(avgPartySize, 2),
            mostRequestedTableId,
            mostRequestedTableNumber
        );

        // 2. Bookings Per Day
        const string dailySql = @"
            SELECT 
                DATE(StartDateTime),
                COUNT(*),
                COALESCE(SUM(Status = 'Pending'), 0),
                COALESCE(SUM(Status = 'Confirmed'), 0),
                COALESCE(SUM(Status = 'Cancelled'), 0),
                COALESCE(SUM(Status = 'Completed'), 0)
            FROM Reservations
            WHERE StartDateTime >= @s AND StartDateTime < @e
            GROUP BY DATE(StartDateTime)
            ORDER BY DATE(StartDateTime) ASC;";

        var dailyMap = new Dictionary<DateOnly, (int total, int pending, int confirmed, int cancelled, int completed)>();

        await using (var cmd = new MySqlCommand(dailySql, connection))
        {
            AddDateParameters(cmd);
            await using var reader = await cmd.ExecuteReaderAsync(token);
            while (await reader.ReadAsync(token))
            {
                var d = DateOnly.FromDateTime(reader.GetDateTime(0));
                var tot = Convert.ToInt32(reader.GetInt64(1));
                var pend = Convert.ToInt32(reader.GetDecimal(2));
                var conf = Convert.ToInt32(reader.GetDecimal(3));
                var canc = Convert.ToInt32(reader.GetDecimal(4));
                var comp = Convert.ToInt32(reader.GetDecimal(5));
                dailyMap[d] = (tot, pend, conf, canc, comp);
            }
        }

        var bookingsPerDay = new List<BookingsPerDayDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (dailyMap.TryGetValue(d, out var val))
            {
                bookingsPerDay.Add(new BookingsPerDayDto(d, val.total, val.pending, val.confirmed, val.cancelled, val.completed));
            }
            else
            {
                bookingsPerDay.Add(new BookingsPerDayDto(d, 0, 0, 0, 0, 0));
            }
        }

        // 3. Table Reservation Share
        // Count only Status IN ('Pending', 'Confirmed', 'Completed')
        const string tablesSql = @"
            SELECT 
                t.Id,
                t.TableNumber,
                t.Capacity,
                COUNT(r.Id) AS TotalReservations,
                COALESCE(SUM(r.Status IN ('Pending', 'Confirmed', 'Completed')), 0) AS ActiveCount
            FROM RestaurantTables t
            LEFT JOIN Reservations r ON r.TableId = t.Id AND r.StartDateTime >= @s AND r.StartDateTime < @e
            GROUP BY t.Id, t.TableNumber, t.Capacity
            ORDER BY ActiveCount DESC, t.TableNumber ASC;";

        var rawTables = new List<(int id, string tableNumber, int capacity, int resCount, int activeCount)>();
        int totalBlocking = 0;

        await using (var cmd = new MySqlCommand(tablesSql, connection))
        {
            AddDateParameters(cmd);
            await using var reader = await cmd.ExecuteReaderAsync(token);
            while (await reader.ReadAsync(token))
            {
                int tid = reader.GetInt32(0);
                string tnum = reader.GetString(1);
                int cap = reader.GetInt32(2);
                int resCnt = Convert.ToInt32(reader.GetInt64(3));
                int actCnt = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetDecimal(4));

                rawTables.Add((tid, tnum, cap, resCnt, actCnt));
                totalBlocking += actCnt;
            }
        }

        var tableShareList = new List<TableReservationShareDto>();
        foreach (var item in rawTables)
        {
            double share = totalBlocking == 0 ? 0 : Math.Round((double)item.activeCount / totalBlocking * 100d, 2);
            tableShareList.Add(new TableReservationShareDto(
                item.id,
                item.tableNumber,
                item.capacity,
                item.resCount,
                item.activeCount,
                share
            ));
        }

        return new ReservationReportDto(from, to, summaryDto, bookingsPerDay, tableShareList);
    }

    private static string EscapeCsvField(string field)
    {
        if (string.IsNullOrEmpty(field))
            return "\"\"";

        // Prevent spreadsheet formula injection: = + - @ \t \r
        if (field.Length > 0 && "=+-@\t\r".Contains(field[0]))
        {
            field = "'" + field;
        }

        return "\"" + field.Replace("\"", "\"\"") + "\"";
    }

    public byte[] ToCsv(ReservationReportDto report)
    {
        var sb = new StringBuilder();

        // Section 1: Period and Summary
        sb.AppendLine("Reservation Report Summary");
        sb.AppendLine($"Reporting Period,{EscapeCsvField(report.From.ToString("yyyy-MM-dd"))} to {EscapeCsvField(report.To.ToString("yyyy-MM-dd"))}");
        sb.AppendLine($"Total Reservations,{report.Summary.TotalReservations}");
        sb.AppendLine($"Confirmed Reservations,{report.Summary.ConfirmedReservations}");
        sb.AppendLine($"Pending Reservations,{report.Summary.PendingReservations}");
        sb.AppendLine($"Cancelled Reservations,{report.Summary.CancelledReservations}");
        sb.AppendLine($"Completed Reservations,{report.Summary.CompletedReservations}");
        sb.AppendLine($"Cancellation Rate (%),{report.Summary.CancellationRate.ToString("F2", CultureInfo.InvariantCulture)}");
        sb.AppendLine($"Average Party Size,{report.Summary.AveragePartySize.ToString("F2", CultureInfo.InvariantCulture)}");
        sb.AppendLine($"Most Requested Table,{EscapeCsvField(report.Summary.MostRequestedTableNumber ?? "N/A")}");
        sb.AppendLine();

        // Section 2: Bookings Per Day
        sb.AppendLine("Bookings Per Day");
        sb.AppendLine("Date,Total,Pending,Confirmed,Cancelled,Completed");
        foreach (var day in report.BookingsPerDay)
        {
            sb.AppendLine($"{EscapeCsvField(day.Date.ToString("yyyy-MM-dd"))},{day.Total},{day.Pending},{day.Confirmed},{day.Cancelled},{day.Completed}");
        }
        sb.AppendLine();

        // Section 3: Table Reservation Share
        sb.AppendLine("Table Reservation Share");
        sb.AppendLine("Table Number,Capacity,Total Reservations,Active Reservations,Reservation Share (%)");
        foreach (var table in report.TableReservationShare)
        {
            sb.AppendLine($"{EscapeCsvField(table.TableNumber)},{table.Capacity},{table.ReservationCount},{table.NonCancelledReservationCount},{table.TableReservationShare.ToString("F2", CultureInfo.InvariantCulture)}");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    public byte[] ToXlsx(ReservationReportDto report)
    {
        using var workbook = new XLWorkbook();

        // Sheet 1: Summary
        var wsSummary = workbook.Worksheets.Add("Summary");
        wsSummary.Cell(1, 1).Value = "Metric";
        wsSummary.Cell(1, 2).Value = "Value";
        wsSummary.Row(1).Style.Font.Bold = true;

        wsSummary.Cell(2, 1).Value = "Reporting Period";
        wsSummary.Cell(2, 2).Value = $"{report.From:yyyy-MM-dd} to {report.To:yyyy-MM-dd}";

        wsSummary.Cell(3, 1).Value = "Total Reservations";
        wsSummary.Cell(3, 2).Value = report.Summary.TotalReservations;

        wsSummary.Cell(4, 1).Value = "Confirmed Reservations";
        wsSummary.Cell(4, 2).Value = report.Summary.ConfirmedReservations;

        wsSummary.Cell(5, 1).Value = "Pending Reservations";
        wsSummary.Cell(5, 2).Value = report.Summary.PendingReservations;

        wsSummary.Cell(6, 1).Value = "Cancelled Reservations";
        wsSummary.Cell(6, 2).Value = report.Summary.CancelledReservations;

        wsSummary.Cell(7, 1).Value = "Completed Reservations";
        wsSummary.Cell(7, 2).Value = report.Summary.CompletedReservations;

        wsSummary.Cell(8, 1).Value = "Cancellation Rate (%)";
        wsSummary.Cell(8, 2).Value = report.Summary.CancellationRate;
        wsSummary.Cell(8, 2).Style.NumberFormat.Format = "0.00";

        wsSummary.Cell(9, 1).Value = "Average Party Size";
        wsSummary.Cell(9, 2).Value = report.Summary.AveragePartySize;
        wsSummary.Cell(9, 2).Style.NumberFormat.Format = "0.00";

        wsSummary.Cell(10, 1).Value = "Most Requested Table";
        wsSummary.Cell(10, 2).Value = report.Summary.MostRequestedTableNumber ?? "N/A";

        wsSummary.SheetView.FreezeRows(1);
        wsSummary.Columns().AdjustToContents();

        // Sheet 2: Bookings Per Day
        var wsDaily = workbook.Worksheets.Add("Bookings Per Day");
        wsDaily.Cell(1, 1).Value = "Date";
        wsDaily.Cell(1, 2).Value = "Total";
        wsDaily.Cell(1, 3).Value = "Pending";
        wsDaily.Cell(1, 4).Value = "Confirmed";
        wsDaily.Cell(1, 5).Value = "Cancelled";
        wsDaily.Cell(1, 6).Value = "Completed";
        wsDaily.Row(1).Style.Font.Bold = true;

        int row = 2;
        foreach (var day in report.BookingsPerDay)
        {
            wsDaily.Cell(row, 1).Value = day.Date.ToString("yyyy-MM-dd");
            wsDaily.Cell(row, 2).Value = day.Total;
            wsDaily.Cell(row, 3).Value = day.Pending;
            wsDaily.Cell(row, 4).Value = day.Confirmed;
            wsDaily.Cell(row, 5).Value = day.Cancelled;
            wsDaily.Cell(row, 6).Value = day.Completed;
            row++;
        }
        wsDaily.SheetView.FreezeRows(1);
        wsDaily.Columns().AdjustToContents();

        // Sheet 3: Table Reservation Share
        var wsTables = workbook.Worksheets.Add("Table Reservation Share");
        wsTables.Cell(1, 1).Value = "Table Number";
        wsTables.Cell(1, 2).Value = "Capacity";
        wsTables.Cell(1, 3).Value = "Total Reservations";
        wsTables.Cell(1, 4).Value = "Active Reservations";
        wsTables.Cell(1, 5).Value = "Reservation Share (%)";
        wsTables.Row(1).Style.Font.Bold = true;

        row = 2;
        foreach (var table in report.TableReservationShare)
        {
            wsTables.Cell(row, 1).Value = table.TableNumber;
            wsTables.Cell(row, 2).Value = table.Capacity;
            wsTables.Cell(row, 3).Value = table.ReservationCount;
            wsTables.Cell(row, 4).Value = table.NonCancelledReservationCount;
            wsTables.Cell(row, 5).Value = table.TableReservationShare;
            wsTables.Cell(row, 5).Style.NumberFormat.Format = "0.00";
            row++;
        }
        wsTables.SheetView.FreezeRows(1);
        wsTables.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
