using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;
    private readonly IIdentityAuditWriter? _auditWriter;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(
        IUserRepository userRepository, 
        ILogger<UserService> logger, 
        IIdentityAuditWriter? auditWriter = null,
        IPasswordHasher? passwordHasher = null)
    {
        _userRepository = userRepository;
        _logger = logger;
        _auditWriter = auditWriter;
        _passwordHasher = passwordHasher ?? new BcryptPasswordHasher();
    }

    public async Task<UserResponseDto?> GetProfileAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }

        return MapToDto(user);
    }

    public async Task<UserResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
    {
        var existingUser = await _userRepository.GetByIdAsync(userId);
        if (existingUser == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        var normalizedNewEmail = request.Email.Trim().ToLowerInvariant();
        if (!string.Equals(existingUser.Email, normalizedNewEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailUser = await _userRepository.GetByEmailAsync(normalizedNewEmail);
            if (emailUser != null && emailUser.UserId != userId)
            {
                throw new InvalidOperationException("Email is already in use by another account");
            }
        }

        var updated = await _userRepository.UpdateUserProfileAsync(
            userId,
            request.FullName.Trim(),
            normalizedNewEmail,
            string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim());

        if (!updated)
        {
            throw new KeyNotFoundException("User not found or no changes were made");
        }

        var freshUser = await _userRepository.GetByIdAsync(userId);
        if (freshUser == null)
        {
            throw new KeyNotFoundException("User not found after update");
        }

        return MapToDto(freshUser);
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequestDto request)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        // Verify current password against stored BCrypt hash
        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Change password rejected for userId {UserId}: Invalid current password", userId);
            throw new InvalidOperationException("Current password is incorrect.");
        }

        // New password cannot be the same as current password
        if (_passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
        {
            _logger.LogWarning("Change password rejected for userId {UserId}: New password cannot be the same as current password", userId);
            throw new InvalidOperationException("New password cannot be the same as the current password.");
        }

        var newPasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        var updated = await _userRepository.UpdatePasswordHashAsync(userId, newPasswordHash);
        if (!updated)
        {
            throw new InvalidOperationException("Failed to update password. Please try again.");
        }

        _logger.LogInformation("Password successfully updated for userId {UserId}", userId);

        if (_auditWriter != null)
        {
            try
            {
                await _auditWriter.LogActionAsync(
                    "PASSWORD_CHANGE",
                    userId,
                    user.Email,
                    "User",
                    userId.ToString(),
                    "Success",
                    new { Message = "User successfully changed account password" });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record audit log for password change on userId {UserId}", userId);
            }
        }

        return true;
    }

    public async Task<AdminUserListResponseDto> GetAdminUsersAsync(AdminUserQueryDto query)
    {
        query ??= new AdminUserQueryDto();
        var (users, totalCount, metrics) = await _userRepository.GetUsersPagedAsync(
            query.Search,
            query.Role,
            query.Status,
            query.Page,
            query.PageSize);

        var totalPages = query.PageSize > 0 ? (int)Math.Ceiling((double)totalCount / query.PageSize) : 0;

        return new AdminUserListResponseDto
        {
            Items = users.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalPages = totalPages,
            Metrics = metrics
        };
    }

    public async Task<UserResponseDto?> GetUserByIdAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        return user != null ? MapToDto(user) : null;
    }

    public async Task<UserResponseDto> UpdateUserStatusAsync(int targetUserId, int currentAdminUserId, string status, string? reason)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Status cannot be empty.", nameof(status));
        }

        var normalizedStatus = char.ToUpperInvariant(status.Trim()[0]) + status.Trim()[1..].ToLowerInvariant();
        if (normalizedStatus is not ("Active" or "Blocked" or "Inactive"))
        {
            throw new ArgumentException("Status must be 'Active', 'Blocked', or 'Inactive'.", nameof(status));
        }

        if (targetUserId == currentAdminUserId)
        {
            if (_auditWriter != null)
            {
                await _auditWriter.LogActionAsync("USER_STATUS_CHANGE_DENIED", currentAdminUserId, "admin@cinnamonbistro.com", "User", targetUserId.ToString(), "Denied", new { Reason = "Attempted to alter status of own administrative account" });
            }
            throw new InvalidOperationException("You cannot alter the status of your own administrative account.");
        }

        var targetUser = await _userRepository.GetByIdAsync(targetUserId);
        if (targetUser == null)
        {
            throw new KeyNotFoundException($"User with ID {targetUserId} not found.");
        }

        var isTargetAdmin = targetUser.Roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);
        if (isTargetAdmin && !normalizedStatus.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var activeAdminCount = await _userRepository.GetActiveAdminCountAsync();
            if (activeAdminCount <= 1)
            {
                if (_auditWriter != null)
                {
                    await _auditWriter.LogActionAsync("USER_STATUS_CHANGE_DENIED", currentAdminUserId, "admin@cinnamonbistro.com", "User", targetUserId.ToString(), "Denied", new { Reason = "Cannot deactivate or block the only remaining active Administrator" });
                }
                throw new InvalidOperationException("Cannot deactivate or block the only remaining active Administrator.");
            }
        }

        var isActive = normalizedStatus.Equals("Active", StringComparison.OrdinalIgnoreCase);
        var updated = await _userRepository.UpdateUserStatusAsync(targetUserId, normalizedStatus, isActive);
        if (!updated)
        {
            throw new InvalidOperationException("Failed to update user status.");
        }

        _logger.LogInformation("Admin {AdminId} changed status of user {UserId} ({Email}) to {Status}. Reason: {Reason}",
            currentAdminUserId, targetUserId, targetUser.Email, normalizedStatus, reason ?? "N/A");

        if (_auditWriter != null)
        {
            var adminUser = await _userRepository.GetByIdAsync(currentAdminUserId);
            var adminEmail = adminUser?.Email ?? "admin@cinnamonbistro.com";
            var actionType = normalizedStatus == "Blocked" ? "USER_BLOCKED" : (normalizedStatus == "Active" ? "USER_UNBLOCKED" : "USER_STATUS_CHANGED");
            await _auditWriter.LogActionAsync(actionType, currentAdminUserId, adminEmail, "User", targetUserId.ToString(), "Success", new
            {
                TargetEmail = targetUser.Email,
                TargetRoles = string.Join(",", targetUser.Roles),
                NewStatus = normalizedStatus,
                Reason = reason ?? "N/A"
            });
        }

        var freshUser = await _userRepository.GetByIdAsync(targetUserId);
        return MapToDto(freshUser!);
    }

    public async Task<bool> DeleteUserAsync(int targetUserId, int currentAdminUserId)
    {
        if (targetUserId == currentAdminUserId)
        {
            if (_auditWriter != null)
            {
                await _auditWriter.LogActionAsync("USER_DELETE_DENIED", currentAdminUserId, "admin@cinnamonbistro.com", "User", targetUserId.ToString(), "Denied", new { Reason = "Attempted to delete own administrative account" });
            }
            throw new InvalidOperationException("You cannot delete your own administrative account.");
        }

        var targetUser = await _userRepository.GetByIdAsync(targetUserId);
        if (targetUser == null)
        {
            throw new KeyNotFoundException($"User with ID {targetUserId} not found.");
        }

        var isTargetAdmin = targetUser.Roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);
        if (isTargetAdmin)
        {
            var activeAdminCount = await _userRepository.GetActiveAdminCountAsync();
            if (activeAdminCount <= 1)
            {
                if (_auditWriter != null)
                {
                    await _auditWriter.LogActionAsync("USER_DELETE_DENIED", currentAdminUserId, "admin@cinnamonbistro.com", "User", targetUserId.ToString(), "Denied", new { Reason = "Cannot delete the only remaining active Administrator" });
                }
                throw new InvalidOperationException("Cannot delete the only remaining active Administrator.");
            }
        }

        // Soft deletion preserving historical relations and referential integrity
        var deleted = await _userRepository.SoftDeleteUserAsync(targetUserId);
        if (deleted)
        {
            _logger.LogInformation("Admin {AdminId} safely soft-deleted user {UserId} ({Email}).", currentAdminUserId, targetUserId, targetUser.Email);

            if (_auditWriter != null)
            {
                var adminUser = await _userRepository.GetByIdAsync(currentAdminUserId);
                var adminEmail = adminUser?.Email ?? "admin@cinnamonbistro.com";
                await _auditWriter.LogActionAsync("USER_DELETED", currentAdminUserId, adminEmail, "User", targetUserId.ToString(), "Success", new
                {
                    TargetEmail = targetUser.Email,
                    TargetRoles = string.Join(",", targetUser.Roles)
                });
            }
        }

        return deleted;
    }

    private static UserResponseDto MapToDto(User user)
    {
        return new UserResponseDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            Status = string.IsNullOrWhiteSpace(user.Status) ? (user.IsActive ? "Active" : "Inactive") : user.Status,
            Roles = user.Roles,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            DeletedAt = user.DeletedAt
        };
    }
}

