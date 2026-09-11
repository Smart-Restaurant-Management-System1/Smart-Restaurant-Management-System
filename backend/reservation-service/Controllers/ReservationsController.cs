using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.Security.Claims;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ReservationsController : ControllerBase
{
    private readonly IAvailabilitySearchValidator _validator;
    private readonly IAvailabilitySearchService _service;
    private readonly IReservationCreationService _creationService;
    private readonly ILogger<ReservationsController> _logger;

    public ReservationsController(IAvailabilitySearchValidator validator, IAvailabilitySearchService service, IReservationCreationService creationService, ILogger<ReservationsController> logger)
    {
        _validator = validator;
        _service = service;
        _creationService = creationService;
        _logger = logger;
    }

    /// <summary>SR-57 advisory availability search. It does not reserve or lock a table; SR-58 must revalidate atomically.</summary>
    [Authorize]
    [HttpGet("availability")]
    [ProducesResponseType(typeof(IEnumerable<AvailableTableResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAvailability([FromQuery] AvailabilitySearchRequestDto request, CancellationToken cancellationToken = default)
    {
        if (!_validator.TryValidate(request, out var criteria, out var errors))
            return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });

        try
        {
            var tables = await _service.SearchAsync(criteria!, cancellationToken);
            return Ok(tables.Select(t => new AvailableTableResponseDto
            {
                TableId = t.TableId,
                TableNumber = t.TableNumber,
                SeatingCapacity = t.SeatingCapacity
            }));
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Availability search failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to search table availability. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected availability search failure.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to search table availability. Please try again later." });
        }
    }

    [Authorize(Roles = AppRoles.Customer)]
    [HttpPost]
    [ProducesResponseType(typeof(ReservationConfirmationResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequestDto request, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        if (request is null) return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["request"] = ["Reservation details are required."] }) { Status = StatusCodes.Status400BadRequest });
        if (request.TableId is null || request.TableId <= 0) errors["tableId"] = ["A valid table ID is required."];
        if (!string.IsNullOrWhiteSpace(idempotencyKey) && idempotencyKey.Length > 64) errors["idempotencyKey"] = ["Idempotency key must not exceed 64 characters."];
        if (errors.Count > 0) return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });

        var availabilityRequest = new AvailabilitySearchRequestDto { Date = request.Date, StartTime = request.StartTime, DurationMinutes = request.DurationMinutes, GuestCount = request.GuestCount };
        if (!_validator.TryValidate(availabilityRequest, out var criteria, out var validationErrors))
            return BadRequest(new ValidationProblemDetails(validationErrors) { Status = StatusCodes.Status400BadRequest });

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId) || customerId <= 0) return Unauthorized();
        try
        {
            var result = await _creationService.CreateAsync(new ReservationCreationCommand(customerId, request.TableId!.Value, criteria!, string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey), cancellationToken);
            if (result.Outcome == ReservationCreateOutcome.TableNotFound) return NotFound(new { message = "The selected table no longer exists. Please search again." });
            if (result.Outcome == ReservationCreateOutcome.Unavailable) return Conflict(new { code = "TABLE_NO_LONGER_AVAILABLE", message = "The selected table is no longer available for this period. Please search again." });
            var response = ToConfirmation(result.Reservation!);
            return result.Outcome == ReservationCreateOutcome.Replayed ? Ok(response) : StatusCode(StatusCodes.Status201Created, response);
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Reservation creation failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to create the reservation. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected reservation creation failure.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to create the reservation. Please try again later." });
        }
    }

    private static ReservationConfirmationResponseDto ToConfirmation(Reservation reservation) => new()
    {
        ReservationId = reservation.Id, BookingReference = reservation.BookingReference, TableId = reservation.TableId,
        TableNumber = reservation.TableNumber, StartDateTime = reservation.StartDateTime, EndDateTime = reservation.EndDateTime,
        GuestCount = reservation.GuestCount, Status = reservation.Status, CreatedAt = reservation.CreatedAt
    };
}
