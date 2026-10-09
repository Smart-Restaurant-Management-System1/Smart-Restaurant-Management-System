using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

/// <summary>
/// Administrative controller for searching, filtering, and exporting restaurant orders (SR-247, SR-248, SR-249).
/// Restricted to Admin and Staff roles; Customer access is strictly forbidden (403).
/// </summary>
[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = AppPolicies.RequireStaff)]
public sealed class AdminOrdersController : ControllerBase
{
    private readonly IAdminOrderService _orderService;
    private readonly ILogger<AdminOrdersController> _logger;

    public AdminOrdersController(IAdminOrderService orderService, ILogger<AdminOrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    /// <summary>
    /// Searches and filters dine-in and reservation pre-orders across the restaurant (SR-247).
    /// </summary>
    [HttpGet]
    [HttpGet("/api/orders/admin")]
    [ProducesResponseType(typeof(AdminOrderResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SearchOrders(
        [FromQuery] AdminOrderQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();

        if (query.Page < 1)
        {
            errors["page"] = ["Page must be at least 1."];
        }

        if (query.PageSize is < 1 or > 100)
        {
            errors["pageSize"] = ["Page size must be between 1 and 100."];
        }

        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(query.DateFrom, query.DateTo);
        if (!isValid)
        {
            errors["dateTo"] = [errorMessage!];
        }

        if (query.OrderReference?.Length > 32)
        {
            errors["orderReference"] = ["Order reference must not exceed 32 characters."];
        }

        if (query.TableNumber?.Length > 32)
        {
            errors["tableNumber"] = ["Table number must not exceed 32 characters."];
        }

        if (errors.Count > 0)
        {
            return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });
        }

        try
        {
            var result = await _orderService.SearchOrdersAsync(query, cancellationToken);
            return Ok(result);
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Database error occurred while querying administrative orders.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to search orders. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while querying administrative orders.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to search orders. Please try again later." });
        }
    }

    /// <summary>
    /// Exports filtered restaurant order records to CSV with formula injection protection (SR-248).
    /// </summary>
    [HttpGet("export")]
    [HttpGet("/api/orders/export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExportOrders(
        [FromQuery] AdminOrderQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();

        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(query.DateFrom, query.DateTo);
        if (!isValid)
        {
            errors["dateTo"] = [errorMessage!];
        }

        if (errors.Count > 0)
        {
            return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });
        }

        try
        {
            var csvBytes = await _orderService.ExportOrdersToCsvAsync(query, cancellationToken);
            var fileName = $"orders-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            return File(csvBytes, "text/csv; charset=utf-8", fileName);
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Database error occurred while exporting administrative orders.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to export orders. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while exporting administrative orders.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to export orders. Please try again later." });
        }
    }
}

