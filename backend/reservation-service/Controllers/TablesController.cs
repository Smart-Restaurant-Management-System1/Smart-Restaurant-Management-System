using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TablesController : ControllerBase
{
    /// <summary>
    /// Public endpoint to check general table availability without requiring login
    /// </summary>
    [AllowAnonymous]
    [HttpGet("availability")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult CheckAvailability()
    {
        return Ok(new
        {
            available = true,
            message = "Tables are available for reservation today."
        });
    }

    /// <summary>
    /// Authenticated endpoint to list all dining tables
    /// </summary>
    [Authorize]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult GetTables()
    {
        return Ok(new[]
        {
            new { tableId = 1, tableNumber = "T-01", capacity = 2, location = "Window" },
            new { tableId = 2, tableNumber = "T-02", capacity = 4, location = "Main Dining" },
            new { tableId = 3, tableNumber = "T-03", capacity = 6, location = "Private Booth" }
        });
    }

    /// <summary>
    /// Admin-only endpoint to configure or create dining tables
    /// </summary>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult CreateTable([FromBody] CreateTableRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TableNumber))
        {
            return BadRequest(new { message = "TableNumber is required" });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            tableId = 4,
            tableNumber = request.TableNumber,
            capacity = request.Capacity,
            location = request.Location
        });
    }
}

public record CreateTableRequest(string TableNumber, int Capacity, string Location);
