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
    private readonly IReservationHistoryService? _historyService;
    private readonly IReservationLifecycleService? _lifecycleService;
    private readonly IAdminReservationService? _adminService;
    private readonly IReservationRescheduleService? _rescheduleService;

    public ReservationsController(IAvailabilitySearchValidator validator, IAvailabilitySearchService service, IReservationCreationService creationService, ILogger<ReservationsController> logger, IReservationHistoryService? historyService = null, IReservationLifecycleService? lifecycleService = null, IAdminReservationService? adminService = null, IReservationRescheduleService? rescheduleService = null)
    {
        _validator = validator;
        _service = service;
        _creationService = creationService;
        _logger = logger;
        _historyService = historyService;
        _lifecycleService = lifecycleService;
        _adminService = adminService;
        _rescheduleService = rescheduleService;
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

    /// <summary>Atomically moves a customer-owned upcoming reservation, or any non-terminal reservation for an administrator.</summary>
    [Authorize(Roles = AppRoles.Customer + "," + AppRoles.Admin)]
    [HttpPut("{reservationId:int}/schedule")]
    [ProducesResponseType(typeof(ReservationConfirmationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RescheduleReservation(int reservationId, [FromBody] RescheduleReservationRequestDto request, CancellationToken cancellationToken = default)
    {
        if (reservationId <= 0 || request is null || request.TableId is null || request.TableId <= 0)
            return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["tableId"] = ["A valid table ID is required."] }) { Status = StatusCodes.Status400BadRequest });
        if (!TryGetCustomerId(out var actorUserId)) return Unauthorized();
        var availabilityRequest = new AvailabilitySearchRequestDto { Date = request.Date, StartTime = request.StartTime, DurationMinutes = request.DurationMinutes, GuestCount = request.GuestCount };
        if (!_validator.TryValidate(availabilityRequest, out var criteria, out var errors)) return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });
        if (_rescheduleService is null) return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Reservation rescheduling is unavailable." });
        try
        {
            var result = await _rescheduleService.RescheduleAsync(new ReservationRescheduleCommand(reservationId, actorUserId, User.IsInRole(AppRoles.Admin), request.TableId.Value, criteria!), cancellationToken);
            return result.Outcome switch
            {
                ReservationRescheduleOutcome.Updated => Ok(ToConfirmation(result.Reservation!)),
                ReservationRescheduleOutcome.NotFound or ReservationRescheduleOutcome.TableNotFound => NotFound(new { message = "The requested reservation or table was not found." }),
                ReservationRescheduleOutcome.Forbidden => Forbid(),
                ReservationRescheduleOutcome.InvalidState => Conflict(new { code = "INVALID_RESERVATION_STATE", message = "This reservation cannot be rescheduled in its current state." }),
                ReservationRescheduleOutcome.Unavailable => Conflict(new { code = "TABLE_NO_LONGER_AVAILABLE", message = "The selected table is no longer available for this period. Please search again." }),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to reschedule the reservation. Please try again later." })
            };
        }
        catch (MySqlException ex) { _logger.LogError(ex, "Reservation reschedule failed for reservation {ReservationId}.", reservationId); return StatusCode(500, new { message = "Unable to reschedule the reservation. Please try again later." }); }
        catch (Exception ex) { _logger.LogError(ex, "Unexpected reservation reschedule failure for reservation {ReservationId}.", reservationId); return StatusCode(500, new { message = "Unable to reschedule the reservation. Please try again later." }); }
    }

    /// <summary>Returns only the authenticated customer's reservations, newest visit first.</summary>
    [Authorize(Roles = AppRoles.Customer)]
    [HttpGet("my-history")]
    [ProducesResponseType(typeof(ReservationHistoryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (page < 1) errors["page"] = ["Page must be at least 1."];
        if (pageSize is < 1 or > 50) errors["pageSize"] = ["Page size must be between 1 and 50."];
        if (errors.Count > 0) return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });
        if (!TryGetCustomerId(out var customerId)) return Unauthorized();
        if (_historyService is null) return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Reservation history is unavailable." });

        try
        {
            var result = await _historyService.GetForCustomerAsync(customerId, page, pageSize, cancellationToken);
            return Ok(new ReservationHistoryResponseDto
            {
                Items = result.Items.Select(ToHistoryItem).ToList(), Page = result.Page, PageSize = result.PageSize,
                TotalCount = result.TotalCount, TotalPages = (int)Math.Ceiling(result.TotalCount / (double)result.PageSize)
            });
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Reservation history retrieval failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to retrieve reservation history. Please try again later." });
        }
    }

    [Authorize(Roles = AppRoles.Customer)]
    [HttpPost("{reservationId:int}/cancel")]
    public async Task<IActionResult> CancelMyReservation(int reservationId, CancellationToken cancellationToken = default)
    {
        if (!TryGetCustomerId(out var customerId)) return Unauthorized();
        return await ChangeStatusAsync(reservationId, customerId, ReservationStatus.Cancelled, false, cancellationToken);
    }

    [Authorize(Roles = AppRoles.Admin)]
    [HttpPatch("{reservationId:int}/status")]
    public async Task<IActionResult> ChangeStatus(int reservationId, [FromBody] UpdateReservationStatusRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request is null || !ReservationStatus.IsKnown(request.Status))
            return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["status"] = ["Status must be Pending, Confirmed, Cancelled, or Completed."] }) { Status = StatusCodes.Status400BadRequest });
        return await ChangeStatusAsync(reservationId, null, request.Status!, true, cancellationToken);
    }

    [Authorize(Roles = AppRoles.Admin)]
    [HttpGet]
    [ProducesResponseType(typeof(AdminReservationResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAdminReservations([FromQuery] AdminReservationQueryDto request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Page < 1) errors["page"] = ["Page must be at least 1."];
        if (request.PageSize is < 1 or > 100) errors["pageSize"] = ["Page size must be between 1 and 100."];
        if (request.VisitFrom is not null && request.VisitTo is not null && request.VisitFrom > request.VisitTo) errors["visitTo"] = ["Visit end date must not be before visit start date."];
        if (!string.IsNullOrWhiteSpace(request.Status) && !ReservationStatus.IsKnown(request.Status)) errors["status"] = ["Status must be Pending, Confirmed, Cancelled, or Completed."];
        if (request.TableNumber?.Length > 32) errors["tableNumber"] = ["Table number must not exceed 32 characters."];
        if (request.BookingReference?.Length > 32) errors["bookingReference"] = ["Booking reference must not exceed 32 characters."];
        if (errors.Count > 0) return BadRequest(new ValidationProblemDetails(errors) { Status = StatusCodes.Status400BadRequest });
        if (_adminService is null) return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Reservation management is unavailable." });
        var page = await _adminService.SearchAsync(new AdminReservationQuery(request.VisitFrom, request.VisitTo, request.Status, request.TableNumber, request.BookingReference, request.Page, request.PageSize), cancellationToken);
        return Ok(ToAdminResponse(page));
    }

    [Authorize(Roles = AppRoles.Admin)]
    [HttpGet("{reservationId:int}")]
    public async Task<IActionResult> GetAdminReservation(int reservationId, CancellationToken cancellationToken = default)
    {
        if (_adminService is null) return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Reservation management is unavailable." });
        var reservation = await _adminService.GetAsync(reservationId, cancellationToken);
        return reservation is null ? NotFound(new { message = "Reservation not found." }) : Ok(ToAdminItem(reservation));
    }

    private async Task<IActionResult> ChangeStatusAsync(int reservationId, int? customerId, string targetStatus, bool returnReservation, CancellationToken cancellationToken)
    {
        if (reservationId <= 0) return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["reservationId"] = ["A valid reservation ID is required."] }) { Status = StatusCodes.Status400BadRequest });
        if (_lifecycleService is null) return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Reservation status changes are unavailable." });
        var outcome = await _lifecycleService.ChangeStatusAsync(reservationId, customerId, targetStatus, cancellationToken);
        return outcome switch
        {
            ReservationStatusUpdateOutcome.Updated when returnReservation && _adminService is not null => Ok(ToAdminItem((await _adminService.GetAsync(reservationId, cancellationToken))!)),
            ReservationStatusUpdateOutcome.Updated => NoContent(),
            ReservationStatusUpdateOutcome.NotFound => NotFound(new { message = "Reservation not found." }),
            _ => Conflict(new { code = "INVALID_RESERVATION_TRANSITION", message = "This reservation cannot move to the requested status." })
        };
    }

    private bool TryGetCustomerId(out int customerId) => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out customerId) && customerId > 0;

    private static ReservationHistoryItemDto ToHistoryItem(Reservation reservation) => new()
    {
        ReservationId = reservation.Id, BookingReference = reservation.BookingReference, TableId = reservation.TableId,
        TableNumber = reservation.TableNumber, StartDateTime = reservation.StartDateTime, EndDateTime = reservation.EndDateTime,
        GuestCount = reservation.GuestCount, Status = reservation.Status, CreatedAt = reservation.CreatedAt, UpdatedAt = reservation.UpdatedAt
    };

    private static AdminReservationItemDto ToAdminItem(Reservation reservation) => new()
    {
        ReservationId = reservation.Id, CustomerId = reservation.CustomerId, BookingReference = reservation.BookingReference, TableId = reservation.TableId,
        TableNumber = reservation.TableNumber, StartDateTime = reservation.StartDateTime, EndDateTime = reservation.EndDateTime, GuestCount = reservation.GuestCount,
        Status = reservation.Status, CreatedAt = reservation.CreatedAt, UpdatedAt = reservation.UpdatedAt
    };

    private static AdminReservationResponseDto ToAdminResponse(ReservationHistoryPage page) => new()
    {
        Items = page.Items.Select(ToAdminItem).ToList(), Page = page.Page, PageSize = page.PageSize, TotalCount = page.TotalCount,
        TotalPages = (int)Math.Ceiling(page.TotalCount / (double)page.PageSize)
    };

    private static ReservationConfirmationResponseDto ToConfirmation(Reservation reservation) => new()
    {
        ReservationId = reservation.Id, BookingReference = reservation.BookingReference, TableId = reservation.TableId,
        TableNumber = reservation.TableNumber, StartDateTime = reservation.StartDateTime, EndDateTime = reservation.EndDateTime,
        GuestCount = reservation.GuestCount, Status = reservation.Status, CreatedAt = reservation.CreatedAt
    };
}
