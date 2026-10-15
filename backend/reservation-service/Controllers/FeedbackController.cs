using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/feedback")]
public sealed class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(IFeedbackService feedbackService, ILogger<FeedbackController> logger)
    {
        _feedbackService = feedbackService;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Customer)]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SubmitFeedback(
        [FromBody] SubmitFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var (response, errorMessage, statusCode) = await _feedbackService.SubmitFeedbackAsync(
            customerId,
            request,
            cancellationToken);

        if (statusCode == StatusCodes.Status201Created && response is not null)
        {
            return StatusCode(StatusCodes.Status201Created, response);
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = AppRoles.Customer)]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFeedback(
        [FromRoute] int id,
        [FromBody] UpdateFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var (response, errorMessage, statusCode) = await _feedbackService.UpdateFeedbackAsync(
            customerId,
            id,
            request,
            cancellationToken);

        if (statusCode == StatusCodes.Status200OK && response is not null)
        {
            return Ok(response);
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = AppRoles.Customer)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMyFeedback(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var (success, errorMessage, statusCode) = await _feedbackService.DeleteMyFeedbackAsync(
            customerId,
            id,
            cancellationToken);

        if (statusCode == StatusCodes.Status204NoContent)
        {
            return NoContent();
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    [HttpGet("my")]
    [Authorize(Roles = AppRoles.Customer)]
    [ProducesResponseType(typeof(IReadOnlyList<FeedbackResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyFeedback(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        var results = await _feedbackService.GetMyFeedbackAsync(customerId, cancellationToken);
        return Ok(results);
    }

    [HttpGet("admin")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(FeedbackPagedResult<FeedbackResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAdminFeedback(
        [FromQuery] AdminFeedbackQuery query,
        CancellationToken cancellationToken)
    {
        var results = await _feedbackService.GetAdminFeedbackAsync(query, cancellationToken);
        return Ok(results);
    }

    [HttpGet("admin/summary")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(FeedbackSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAdminSummary(CancellationToken cancellationToken)
    {
        var summary = await _feedbackService.GetAdminSummaryAsync(cancellationToken);
        return Ok(summary);
    }

    [HttpDelete("admin/{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminDeleteFeedback(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var (success, errorMessage, statusCode) = await _feedbackService.AdminDeleteFeedbackAsync(
            id,
            cancellationToken);

        if (statusCode == StatusCodes.Status204NoContent)
        {
            return NoContent();
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    [HttpPatch("admin/{id:int}/read")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminMarkAsRead(
        [FromRoute] int id,
        [FromBody] AdminUpdateReadStatusRequest? request,
        CancellationToken cancellationToken)
    {
        var isRead = request?.IsRead ?? true;
        var (success, errorMessage, statusCode) = await _feedbackService.AdminMarkAsReadAsync(
            id,
            isRead,
            cancellationToken);

        if (statusCode == StatusCodes.Status200OK)
        {
            return Ok(new { message = isRead ? "Feedback marked as read." : "Feedback marked as unread." });
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    [HttpPost("admin/{id:int}/reply")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminReply(
        [FromRoute] int id,
        [FromBody] AdminReplyRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var adminId))
        {
            return Unauthorized(new { message = "A valid administrator identity is required." });
        }

        var (response, errorMessage, statusCode) = await _feedbackService.AdminReplyAsync(
            adminId,
            id,
            request,
            cancellationToken);

        if (statusCode == StatusCodes.Status200OK && response is not null)
        {
            return Ok(response);
        }

        return StatusCode(statusCode, new { message = errorMessage });
    }

    private bool TryGetUserId(out int userId)
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")?.Value;
        return int.TryParse(idClaim, out userId) && userId > 0;
    }
}

