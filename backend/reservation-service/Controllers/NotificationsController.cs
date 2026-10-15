using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Roles = AppRoles.Customer)]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationService notificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// SR-238: Retrieve paginated notifications for the authenticated customer (newest first).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(NotificationListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool unreadOnly = false,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var result = await _notificationService.GetCustomerNotificationsAsync(
            customerId,
            page,
            pageSize,
            unreadOnly,
            cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// SR-238 / SR-237: Get unread notification count for badge display.
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken = default)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var unreadCount = await _notificationService.GetUnreadCountAsync(customerId, cancellationToken);
        return Ok(new { unreadCount });
    }

    /// <summary>
    /// SR-241: Mark a single notification as read.
    /// Rejects requests for notifications belonging to someone else with 404 without leaking existence.
    /// </summary>
    [HttpPatch("{id:int}/read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(
        [FromRoute] int id,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        if (id <= 0)
        {
            return NotFound(new { message = "Notification not found." });
        }

        var success = await _notificationService.MarkAsReadAsync(customerId, id, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = "Notification not found." });
        }

        return Ok(new { message = "Notification marked as read." });
    }

    /// <summary>
    /// SR-241: Mark all notifications as read for the authenticated customer.
    /// </summary>
    [HttpPost("mark-all-read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var updatedCount = await _notificationService.MarkAllAsReadAsync(customerId, cancellationToken);
        return Ok(new { message = "All notifications marked as read.", count = updatedCount });
    }

    private bool TryGetCustomerId(out int customerId)
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")?.Value;
        return int.TryParse(idClaim, out customerId) && customerId > 0;
    }
}

