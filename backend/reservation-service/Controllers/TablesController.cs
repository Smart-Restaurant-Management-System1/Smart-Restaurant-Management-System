using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.DTOs;
using ReservationService.Exceptions;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TablesController : ControllerBase
{
    private readonly ITableRepository _tableRepository;
    private readonly ILogger<TablesController> _logger;

    public TablesController(ITableRepository tableRepository, ILogger<TablesController> logger)
    {
        _tableRepository = tableRepository ?? throw new ArgumentNullException(nameof(tableRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

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
    /// Admin-only endpoint to list all dining tables
    /// </summary>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<TableResponseDto>))]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetTables([FromQuery] bool? activeOnly = null, CancellationToken cancellationToken = default)
    {
        var tables = await _tableRepository.GetAllTablesAsync(activeOnly, cancellationToken);

        var response = tables.Select(t => new TableResponseDto
        {
            Id = t.Id,
            TableNumber = t.TableNumber,
            Capacity = t.Capacity,
            Location = t.Location,
            Status = ResolveStatus(t),
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt
        });

        return Ok(response);
    }

    /// <summary>
    /// SR-13: Returns all active (IsActive = 1) restaurant tables for authenticated customers and staff.
    /// This is an inventory view only — it does NOT reflect real-time availability by date/time (see SR-57).
    /// </summary>
    [Authorize]
    [HttpGet("active")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<ActiveTableResponseDto>))]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetActiveTables(CancellationToken cancellationToken = default)
    {
        try
        {
            var tables = await _tableRepository.GetActiveTablesAsync(cancellationToken);
            var response = tables.Select(t => new ActiveTableResponseDto
            {
                TableId = t.Id,
                TableNumber = t.TableNumber,
                SeatingCapacity = t.Capacity,
                OperationalStatus = ResolveStatus(t)
            });

            return Ok(response);
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Unable to retrieve active restaurant tables.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "Unable to retrieve active restaurant tables. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while retrieving active restaurant tables.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "Unable to retrieve active restaurant tables. Please try again later." });
        }
    }

    /// <summary>
    /// Admin-only endpoint to get details of a specific table by ID
    /// </summary>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TableResponseDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTableById(int id, CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Invalid table ID." });
        }

        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null)
        {
            return NotFound(new { message = $"Table with ID {id} was not found." });
        }

        return Ok(new TableResponseDto
        {
            Id = table.Id,
            TableNumber = table.TableNumber,
            Capacity = table.Capacity,
            Location = table.Location,
            Status = ResolveStatus(table),
            IsActive = table.IsActive,
            CreatedAt = table.CreatedAt
        });
    }

    /// <summary>
    /// Admin-only endpoint to configure or create dining tables
    /// </summary>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(TableResponseDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateTable([FromBody] CreateTableRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Table data is required." });
        }

        if (string.IsNullOrWhiteSpace(request.TableNumber))
        {
            return BadRequest(new { message = "Table number is required." });
        }

        if (request.Capacity <= 0)
        {
            return BadRequest(new { message = "Capacity must be greater than 0." });
        }

        if (string.IsNullOrWhiteSpace(request.Location))
        {
            return BadRequest(new { message = "Location is required." });
        }

        string statusTrimmed = string.IsNullOrWhiteSpace(request.Status) ? "Available" : request.Status.Trim();
        bool isAvailable = string.Equals(statusTrimmed, "Available", StringComparison.OrdinalIgnoreCase);
        bool isOccupied = string.Equals(statusTrimmed, "Occupied", StringComparison.OrdinalIgnoreCase);
        bool isInactive = string.Equals(statusTrimmed, "Inactive", StringComparison.OrdinalIgnoreCase);

        if (!isAvailable && !isOccupied && !isInactive)
        {
            return BadRequest(new { message = "Status must be 'Available', 'Occupied', or 'Inactive'." });
        }

        string resolvedStatus = isAvailable ? "Available" : (isOccupied ? "Occupied" : "Inactive");

        var table = new RestaurantTable
        {
            TableNumber = request.TableNumber.Trim(),
            Capacity = request.Capacity,
            Location = request.Location.Trim(),
            Status = resolvedStatus,
            IsActive = !isInactive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            var created = await _tableRepository.CreateTableAsync(table, cancellationToken);

            var response = new TableResponseDto
            {
                Id = created.Id,
                TableNumber = created.TableNumber,
                Capacity = created.Capacity,
                Location = created.Location,
                Status = ResolveStatus(created),
                IsActive = created.IsActive,
                CreatedAt = created.CreatedAt
            };

            return CreatedAtAction(nameof(GetTableById), new { id = created.Id }, response);
        }
        catch (DuplicateTableNumberException ex)
        {
            _logger.LogWarning(ex, "Duplicate table number: {TableNumber}", request.TableNumber);
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error creating table: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Admin-only endpoint to update an existing dining table's capacity and location
    /// </summary>
    /// <remarks>
    /// Updates only Capacity and Location. Table number, ID, and creation date cannot be overwritten.
    /// </remarks>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TableResponseDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTable(int id, [FromBody] UpdateTableRequestDto request, CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Invalid table ID." });
        }

        if (request == null)
        {
            return BadRequest(new { message = "Table data is required." });
        }

        if (request.Capacity <= 0 || request.Capacity > 100)
        {
            return BadRequest(new { message = "Capacity must be between 1 and 100." });
        }

        if (string.IsNullOrWhiteSpace(request.Location) || request.Location.Trim().Length > 100)
        {
            return BadRequest(new { message = "Location is required and must not exceed 100 characters." });
        }

        var existingTable = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (existingTable == null)
        {
            return NotFound(new { message = $"Table with ID {id} was not found." });
        }

        // Occupied rule: Table that is occupied cannot be edited until its status is set to Available
        bool isReleasing = string.Equals(request.Status?.Trim(), "Available", StringComparison.OrdinalIgnoreCase);
        if (string.Equals(existingTable.Status, "Occupied", StringComparison.OrdinalIgnoreCase) && !isReleasing)
        {
            return BadRequest(new { message = $"Table '{existingTable.TableNumber}' is currently occupied and cannot be edited. It must be set to 'Available' first." });
        }

        try
        {
            RestaurantTable? updated;
            if (string.Equals(existingTable.Status, "Occupied", StringComparison.OrdinalIgnoreCase) && isReleasing)
            {
                existingTable.Capacity = request.Capacity;
                existingTable.Location = request.Location.Trim();
                existingTable.Status = "Available";
                existingTable.IsActive = true;
                updated = await _tableRepository.UpdateTableAsync(existingTable, cancellationToken);
            }
            else
            {
                updated = await _tableRepository.UpdateTableCapacityAndLocationAsync(id, request.Capacity, request.Location.Trim(), cancellationToken);
            }

            if (updated == null)
            {
                return NotFound(new { message = $"Table with ID {id} was not found." });
            }

            var response = new TableResponseDto
            {
                Id = updated.Id,
                TableNumber = updated.TableNumber,
                Capacity = updated.Capacity,
                Location = updated.Location,
                Status = ResolveStatus(updated),
                IsActive = updated.IsActive,
                CreatedAt = updated.CreatedAt
            };

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error updating table: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Admin-only endpoint to soft-deactivate a dining table
    /// </summary>
    /// <remarks>
    /// Performs a soft deactivation by setting IsActive = false and Status = 'Inactive'.
    /// Preserves table identity and historical reservation records, and never physically deletes the database row.
    /// </remarks>
    [Authorize(Roles = AppRoles.Admin)]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTable(int id, CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Invalid table ID." });
        }

        var existingTable = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (existingTable == null)
        {
            return NotFound(new { message = $"Table with ID {id} was not found." });
        }

        // Occupied rule: Table that is occupied cannot be deleted until it becomes available again
        if (string.Equals(existingTable.Status, "Occupied", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"Table '{existingTable.TableNumber}' is currently occupied and cannot be deleted until it becomes available again." });
        }

        var result = await _tableRepository.SoftDeleteTableAsync(id, cancellationToken);
        if (result == TableDeactivationResult.NotFound)
        {
            return NotFound(new { message = $"Table with ID {id} was not found." });
        }

        return NoContent();
    }

    private static string ResolveStatus(RestaurantTable table)
    {
        if (!table.IsActive)
        {
            return "Inactive";
        }

        if (string.Equals(table.Status, "Occupied", StringComparison.OrdinalIgnoreCase))
        {
            return "Occupied";
        }

        return "Available";
    }
}
