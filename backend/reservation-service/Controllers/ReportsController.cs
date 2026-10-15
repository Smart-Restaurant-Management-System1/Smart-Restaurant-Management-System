using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

/// <summary>
/// Admin-only controller for reservation reporting, analytics, and exports (SR-63, SR-84, SR-86).
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class ReportsController : ControllerBase
{
    private readonly IReservationReportService _reports;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReservationReportService reports, ILogger<ReportsController> logger)
    {
        _reports = reports;
        _logger = logger;
    }

    /// <summary>
    /// Aggregated reservation analytics report for a date range (Admin only).
    /// </summary>
    [HttpGet("reservations")]
    [ProducesResponseType(typeof(ReservationReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Get([FromQuery] ReservationReportQueryDto query, CancellationToken cancellationToken = default)
    {
        var validation = ValidateAndResolveRange(query);
        if (validation.Error is not null)
        {
            return BadRequest(new { message = validation.Error });
        }

        try
        {
            var report = await _reports.GetAsync(validation.From!.Value, validation.To!.Value, cancellationToken);
            return Ok(report);
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Database error generating reservation report.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to generate reservation report. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error generating reservation report.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to generate reservation report. Please try again later." });
        }
    }

    /// <summary>
    /// Export reservation report as CSV or Excel (XLSX) format (Admin only).
    /// </summary>
    [HttpGet("reservations/export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Export(
        [FromQuery] ReservationReportQueryDto query,
        [FromQuery] string format = "csv",
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateAndResolveRange(query);
        if (validation.Error is not null)
        {
            return BadRequest(new { message = validation.Error });
        }

        var normalizedFormat = format?.Trim().ToLowerInvariant();
        if (normalizedFormat is not ("csv" or "xlsx"))
        {
            return BadRequest(new { message = "Format must be csv or xlsx." });
        }

        try
        {
            var report = await _reports.GetAsync(validation.From!.Value, validation.To!.Value, cancellationToken);
            var filename = $"reservation-report-{validation.From:yyyy-MM-dd}-to-{validation.To:yyyy-MM-dd}";

            if (normalizedFormat == "csv")
            {
                var bytes = _reports.ToCsv(report);
                return File(bytes, "text/csv; charset=utf-8", $"{filename}.csv");
            }
            else
            {
                var bytes = _reports.ToXlsx(report);
                return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{filename}.xlsx");
            }
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Database error generating reservation report export.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to generate report export. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error generating reservation report export.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to generate report export. Please try again later." });
        }
    }

    private static (DateOnly? From, DateOnly? To, string? Error) ValidateAndResolveRange(ReservationReportQueryDto query)
    {
        var to = query.To ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var from = query.From ?? to.AddDays(-29);

        if (from > to)
        {
            return (null, null, "From date must not be later than To date.");
        }

        if (to.DayNumber - from.DayNumber > 91)
        {
            return (null, null, "Date range cannot exceed 92 days.");
        }

        return (from, to, null);
    }
}
