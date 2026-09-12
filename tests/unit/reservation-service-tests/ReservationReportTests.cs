using System.IO;
using System.Security.Claims;
using System.Text;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationReportTests
{
    [Fact]
    public async Task GetReport_ValidRange_ReturnsOkWithReport()
    {
        var mockService = new Mock<IReservationReportService>();
        var from = new DateOnly(2026, 9, 1);
        var to = new DateOnly(2026, 9, 10);
        var expectedReport = CreateSampleReport(from, to);

        mockService.Setup(s => s.GetAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedReport);

        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Get(new ReservationReportQueryDto { From = from, To = to });

        var okResult = Assert.IsType<OkObjectResult>(result);
        var report = Assert.IsType<ReservationReportDto>(okResult.Value);
        Assert.Equal(expectedReport.Summary.TotalReservations, report.Summary.TotalReservations);
        Assert.Equal(expectedReport.Summary.CompletedReservations, report.Summary.CompletedReservations);
        Assert.Equal(10, report.BookingsPerDay.Count);
    }

    [Fact]
    public async Task GetReport_InvalidDateRange_FromAfterTo_Returns400()
    {
        var mockService = new Mock<IReservationReportService>();
        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Get(new ReservationReportQueryDto
        {
            From = new DateOnly(2026, 9, 15),
            To = new DateOnly(2026, 9, 10)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("From date must not be later than To date", badRequest.Value!.ToString());
        mockService.Verify(s => s.GetAsync(It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetReport_RangeExceedsMaximum92Days_Returns400()
    {
        var mockService = new Mock<IReservationReportService>();
        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Get(new ReservationReportQueryDto
        {
            From = new DateOnly(2026, 1, 1),
            To = new DateOnly(2026, 6, 1) // ~150 days
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Date range cannot exceed 92 days", badRequest.Value!.ToString());
    }

    [Fact]
    public async Task GetReport_DefaultRangeAppliedWhenNull()
    {
        var mockService = new Mock<IReservationReportService>();
        ReservationReportDto? captured = null;
        mockService.Setup(s => s.GetAsync(It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .Callback<DateOnly, DateOnly, CancellationToken>((f, t, _) => captured = CreateSampleReport(f, t))
            .ReturnsAsync(() => captured!);

        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Get(new ReservationReportQueryDto());

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(captured);
        var daysDifference = captured!.To.DayNumber - captured.From.DayNumber;
        Assert.Equal(29, daysDifference); // 30-day default window
    }

    [Fact]
    public async Task Export_CsvFormat_ReturnsCsvFileResult()
    {
        var mockService = new Mock<IReservationReportService>();
        var from = new DateOnly(2026, 9, 1);
        var to = new DateOnly(2026, 9, 5);
        var sampleReport = CreateSampleReport(from, to);

        mockService.Setup(s => s.GetAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sampleReport);
        mockService.Setup(s => s.ToCsv(sampleReport))
            .Returns(Encoding.UTF8.GetBytes("Reservation Report Summary\r\nTotal,10"));

        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Export(new ReservationReportQueryDto { From = from, To = to }, "csv");

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", fileResult.ContentType);
        Assert.Equal("reservation-report-2026-09-01-to-2026-09-05.csv", fileResult.FileDownloadName);
    }

    [Fact]
    public async Task Export_XlsxFormat_ReturnsXlsxFileResult()
    {
        var mockService = new Mock<IReservationReportService>();
        var from = new DateOnly(2026, 9, 1);
        var to = new DateOnly(2026, 9, 5);
        var sampleReport = CreateSampleReport(from, to);

        mockService.Setup(s => s.GetAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sampleReport);
        mockService.Setup(s => s.ToXlsx(sampleReport))
            .Returns([1, 2, 3]);

        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Export(new ReservationReportQueryDto { From = from, To = to }, "xlsx");

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
        Assert.Equal("reservation-report-2026-09-01-to-2026-09-05.xlsx", fileResult.FileDownloadName);
    }

    [Fact]
    public async Task Export_InvalidFormat_Returns400()
    {
        var mockService = new Mock<IReservationReportService>();
        var controller = CreateController(mockService.Object, AppRoles.Admin);
        var result = await controller.Export(new ReservationReportQueryDto
        {
            From = new DateOnly(2026, 9, 1),
            To = new DateOnly(2026, 9, 5)
        }, "pdf");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Format must be csv or xlsx", badRequest.Value!.ToString());
    }

    [Fact]
    public void Service_ToCsv_EscapesFormulaInjectionAndQuotes()
    {
        var service = new ReservationReportService(null!);
        var report = new ReservationReportDto(
            new DateOnly(2026, 9, 1),
            new DateOnly(2026, 9, 2),
            new ReservationReportSummaryDto(10, 5, 2, 1, 2, 10.0, 3.5, 1, "=CMD|' /C calc'!A0"),
            new List<BookingsPerDayDto>
            {
                new(new DateOnly(2026, 9, 1), 6, 1, 3, 1, 1),
                new(new DateOnly(2026, 9, 2), 4, 1, 2, 0, 1)
            },
            new List<TableReservationShareDto>
            {
                new(1, "+123-Table", 4, 5, 5, 50.0),
                new(2, "@Table\"Danger\"", 4, 5, 5, 50.0)
            }
        );

        var csvBytes = service.ToCsv(report);
        var csvString = Encoding.UTF8.GetString(csvBytes);

        // Formula injection protection check: prefixed with '
        Assert.Contains("\"'=CMD|' /C calc'!A0\"", csvString);
        Assert.Contains("\"'+123-Table\"", csvString);
        Assert.Contains("\"'@Table\"\"Danger\"\"\"", csvString);

        // Summary metrics present
        Assert.Contains("Completed Reservations,2", csvString);
        Assert.Contains("Cancellation Rate (%),10.00", csvString);
    }

    [Fact]
    public void Service_ToXlsx_GeneratesWorksheetsWithCorrectNames()
    {
        var service = new ReservationReportService(null!);
        var report = CreateSampleReport(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 3));

        var bytes = service.ToXlsx(report);
        Assert.NotEmpty(bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        Assert.Equal(3, workbook.Worksheets.Count);
        Assert.True(workbook.Worksheets.Contains("Summary"));
        Assert.True(workbook.Worksheets.Contains("Bookings Per Day"));
        Assert.True(workbook.Worksheets.Contains("Table Reservation Share"));

        var summaryWs = workbook.Worksheet("Summary");
        Assert.Equal("Total Reservations", summaryWs.Cell(3, 1).GetString());
        Assert.Equal(10, summaryWs.Cell(3, 2).GetDouble());
        Assert.Equal("Completed Reservations", summaryWs.Cell(7, 1).GetString());
        Assert.Equal(2, summaryWs.Cell(7, 2).GetDouble());

        var dailyWs = workbook.Worksheet("Bookings Per Day");
        Assert.Equal("Date", dailyWs.Cell(1, 1).GetString());
        Assert.Equal("Completed", dailyWs.Cell(1, 6).GetString());

        var tablesWs = workbook.Worksheet("Table Reservation Share");
        Assert.Equal("Table Number", tablesWs.Cell(1, 1).GetString());
        Assert.Equal("Reservation Share (%)", tablesWs.Cell(1, 5).GetString());
    }

    [Fact]
    public void Service_ZeroReservations_ProducesZeroCancellationRate()
    {
        var summary = new ReservationReportSummaryDto(
            0, 0, 0, 0, 0, 0.0, 0.0, null, null
        );
        Assert.Equal(0.0, summary.CancellationRate);
    }

    [Fact]
    public void ReportsController_HasAdminAuthorizationAttribute()
    {
        var type = typeof(ReportsController);
        var authAttr = (Microsoft.AspNetCore.Authorization.AuthorizeAttribute?)
            Attribute.GetCustomAttribute(type, typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute));

        Assert.NotNull(authAttr);
        Assert.Equal(AppRoles.Admin, authAttr!.Roles);
    }

    private static ReportsController CreateController(IReservationReportService reportService, string role = AppRoles.Admin)
    {
        var logger = Mock.Of<ILogger<ReportsController>>();
        var controller = new ReportsController(reportService, logger);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Role, role)
                ], "TestAuth"))
            }
        };
        return controller;
    }

    private static ReservationReportDto CreateSampleReport(DateOnly from, DateOnly to)
    {
        var summary = new ReservationReportSummaryDto(
            TotalReservations: 10,
            ConfirmedReservations: 5,
            PendingReservations: 2,
            CancelledReservations: 1,
            CompletedReservations: 2,
            CancellationRate: 10.0,
            AveragePartySize: 3.4,
            MostRequestedTableId: 1,
            MostRequestedTableNumber: "T-01"
        );

        var days = new List<BookingsPerDayDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            days.Add(new BookingsPerDayDto(d, 1, 0, 1, 0, 0));
        }

        var tables = new List<TableReservationShareDto>
        {
            new(1, "T-01", 4, 6, 6, 66.67),
            new(2, "T-02", 2, 3, 3, 33.33)
        };

        return new ReservationReportDto(from, to, summary, days, tables);
    }
}
