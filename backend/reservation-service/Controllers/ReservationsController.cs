using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ReservationsController : ControllerBase
{
    private readonly IAvailabilitySearchValidator _validator;
    private readonly IAvailabilitySearchService _service;
    private readonly ILogger<ReservationsController> _logger;

    public ReservationsController(IAvailabilitySearchValidator validator, IAvailabilitySearchService service, ILogger<ReservationsController> logger)
    {
        _validator = validator;
        _service = service;
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
}
