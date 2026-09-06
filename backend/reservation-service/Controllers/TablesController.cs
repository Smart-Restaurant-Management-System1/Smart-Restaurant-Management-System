using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    /// Authenticated endpoint to list all dining tables
    /// </summary>
    [Authorize]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<TableResponseDto>))]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetTables([FromQuery] bool? activeOnly = null, CancellationToken cancellationToken = default)
    {
        var tables = await _tableRepository.GetAllTablesAsync(activeOnly, cancellationToken);

        var response = tables.Select(t => new TableResponseDto
        {
            Id = t.Id,
            TableNumber = t.TableNumber,
            Capacity = t.Capacity,
            Location = t.Location,
            Status = t.IsActive ? "Available" : "Inactive",
            CreatedAt = t.CreatedAt
        });

        return Ok(response);
    }

    /// <summary>
    /// Authenticated endpoint to get details of a specific table by ID
    /// </summary>
    [Authorize]
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TableResponseDto))]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTableById(int id, CancellationToken cancellationToken = default)
    {
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
            Status = table.IsActive ? "Available" : "Inactive",
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
        bool isInactive = string.Equals(statusTrimmed, "Inactive", StringComparison.OrdinalIgnoreCase);

        if (!isAvailable && !isInactive)
        {
            return BadRequest(new { message = "Status must be either 'Available' or 'Inactive'." });
        }

        var table = new RestaurantTable
        {
            TableNumber = request.TableNumber.Trim(),
            Capacity = request.Capacity,
            Location = request.Location.Trim(),
            IsActive = isAvailable,
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
                Status = created.IsActive ? "Available" : "Inactive",
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
}
