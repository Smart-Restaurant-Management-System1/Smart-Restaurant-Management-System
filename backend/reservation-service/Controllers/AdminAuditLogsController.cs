using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Controllers;

/// <summary>
/// Admin-only controller for reviewing immutable administrative audit logs (SR-223 / SR-253).
/// Strictly append-only: exposes NO endpoint to create, edit, or delete audit logs.
/// </summary>
[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly ILogger<AdminAuditLogsController> _logger;

    public AdminAuditLogsController(IAuditLogRepository auditLogRepository, ILogger<AdminAuditLogsController> logger)
    {
        _auditLogRepository = auditLogRepository;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/audit-logs
    /// Retrieves paginated audit logs filtered by date range, action type, admin ID, or keyword.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedAuditLogsResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AdminAuditLogQueryDto query, CancellationToken cancellationToken)
    {
        if (query.FromDate.HasValue && query.ToDate.HasValue)
        {
            if (query.FromDate.Value > query.ToDate.Value)
            {
                return BadRequest(new { message = "The 'from' date cannot be after the 'to' date." });
            }

            if ((query.ToDate.Value - query.FromDate.Value).TotalDays > 90)
            {
                return BadRequest(new { message = "Date range cannot exceed 90 days." });
            }
        }

        if (query.Page < 1)
        {
            query.Page = 1;
        }

        if (query.PageSize < 1 || query.PageSize > 100)
        {
            query.PageSize = 20;
        }

        try
        {
            var result = await _auditLogRepository.GetPagedAuditLogsAsync(query, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve administrative audit logs.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving audit logs." });
        }
    }

    /// <summary>
    /// GET /api/admin/audit-logs/actions
    /// Retrieves the distinct list of recorded action types for filter dropdowns.
    /// </summary>
    [HttpGet("actions")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetActionTypes(CancellationToken cancellationToken)
    {
        try
        {
            var actions = await _auditLogRepository.GetDistinctActionTypesAsync(cancellationToken);
            return Ok(actions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve audit log action types.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving action types." });
        }
    }
}

