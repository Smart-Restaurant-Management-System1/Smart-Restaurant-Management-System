using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

/// <summary>
/// Controller for Admin Operational Dashboard metrics, summary aggregations and trends (SR-243 / SR-244 / SR-245).
/// Protected strictly with [Authorize(Roles = AppRoles.Admin)].
/// </summary>
[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;
    private readonly ILogger<AdminDashboardController> _logger;

    public AdminDashboardController(
        IAdminDashboardService dashboardService,
        ILogger<AdminDashboardController> logger)
    {
        _dashboardService = dashboardService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/dashboard/reservations-summary
    /// Returns aggregated customer, staff, and reservation metrics along with daily trends for the selected date range.
    /// </summary>
    [HttpGet("reservations-summary")]
    [ProducesResponseType(typeof(DashboardReservationsSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetReservationsSummary(
        [FromQuery] DashboardQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var validation = _dashboardService.ValidateAndResolveDateRange(query.From, query.To);
        if (validation.Error is not null)
        {
            return BadRequest(new { message = validation.Error });
        }

        try
        {
            var summary = await _dashboardService.GetReservationsSummaryAsync(
                validation.From,
                validation.To,
                cancellationToken
            );
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin dashboard reservations summary.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving dashboard reservation metrics." }
            );
        }
    }

    /// <summary>
    /// GET /api/admin/dashboard/orders-summary
    /// Returns aggregated order and kitchen activity metrics, menu catalog availability breakdown, and daily order trends.
    /// </summary>
    [HttpGet("orders-summary")]
    [ProducesResponseType(typeof(DashboardOrdersSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOrdersSummary(
        [FromQuery] DashboardQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var validation = _dashboardService.ValidateAndResolveDateRange(query.From, query.To);
        if (validation.Error is not null)
        {
            return BadRequest(new { message = validation.Error });
        }

        try
        {
            var summary = await _dashboardService.GetOrdersSummaryAsync(
                validation.From,
                validation.To,
                cancellationToken
            );
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin dashboard orders summary.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving dashboard order metrics." }
            );
        }
    }

    /// <summary>
    /// GET /api/admin/dashboard/overview
    /// Unified operational analytics endpoint returning all metrics, category breakdowns, and trends in a single payload (SR-245).
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(DashboardOverviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetDashboardOverview(
        [FromQuery] DashboardQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var validation = _dashboardService.ValidateAndResolveDateRange(query.From, query.To);
        if (validation.Error is not null)
        {
            return BadRequest(new { message = validation.Error });
        }

        try
        {
            var overview = await _dashboardService.GetDashboardOverviewAsync(
                validation.From,
                validation.To,
                cancellationToken
            );
            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unified admin dashboard overview.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An error occurred while retrieving dashboard overview metrics." }
            );
        }
    }
}

