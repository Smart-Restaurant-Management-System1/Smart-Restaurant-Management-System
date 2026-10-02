using System.Security.Claims;
using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Controllers;

/// <summary>
/// Admin-only controller for managing Customer and Staff user accounts (SR-218).
/// Enforces strict role-based access control (RBAC), self-action prevention,
/// and safe lifecycle operations.
/// </summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminUsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(IUserService userService, ILogger<AdminUsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/users
    /// Retrieves a paginated list of users with search, role, and status filters,
    /// along with high-level user metrics.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminUserListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers([FromQuery] AdminUserQueryDto query)
    {
        try
        {
            var result = await _userService.GetAdminUsersAsync(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin user list.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving user accounts." });
        }
    }

    /// <summary>
    /// GET /api/admin/users/{id}
    /// Retrieves detailed user information by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserById([FromRoute] int id)
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"User with ID {id} was not found." });
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user with ID {UserId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving user details." });
        }
    }

    /// <summary>
    /// PUT /api/admin/users/{id}/status
    /// Updates the status of a user (Active, Blocked, or Inactive).
    /// </summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus([FromRoute] int id, [FromBody] UpdateUserStatusRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var currentAdminId = GetCurrentUserId();
        if (currentAdminId == null)
        {
            return Unauthorized(new { message = "Invalid or missing administrative identity in token." });
        }

        try
        {
            var updatedUser = await _userService.UpdateUserStatusAsync(id, currentAdminId.Value, request.Status, request.Reason);
            return Ok(updatedUser);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status for user {UserId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while updating the account status." });
        }
    }

    /// <summary>
    /// DELETE /api/admin/users/{id}
    /// Safely deletes (deactivates) a user while preserving database referential integrity.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser([FromRoute] int id)
    {
        var currentAdminId = GetCurrentUserId();
        if (currentAdminId == null)
        {
            return Unauthorized(new { message = "Invalid or missing administrative identity in token." });
        }

        try
        {
            var success = await _userService.DeleteUserAsync(id, currentAdminId.Value);
            if (!success)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to delete user account." });
            }

            return Ok(new { success = true, message = "User account has been safely deactivated and removed from active access." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while deleting the user account." });
        }
    }

    private int? GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? User.FindFirst("sub")?.Value
                   ?? User.FindFirst("userId")?.Value;

        return int.TryParse(idClaim, out var userId) ? userId : null;
    }
}

