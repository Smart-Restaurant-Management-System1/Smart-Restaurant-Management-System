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
        if (!TryGetCustomerId(out var customerId))
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

    [HttpGet("my")]
    [Authorize(Roles = AppRoles.Customer)]
    [ProducesResponseType(typeof(IReadOnlyList<FeedbackResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyFeedback(CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
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

    private bool TryGetCustomerId(out int customerId)
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")?.Value;
        return int.TryParse(idClaim, out customerId) && customerId > 0;
    }
}
