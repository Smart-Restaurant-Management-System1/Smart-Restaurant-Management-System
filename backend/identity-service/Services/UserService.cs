using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
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

        var freshUser = await _userRepository.GetByIdAsync(targetUserId);
        return MapToDto(freshUser!);
    }

    public async Task<bool> DeleteUserAsync(int targetUserId, int currentAdminUserId)
    {
        if (targetUserId == currentAdminUserId)
        {
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
                throw new InvalidOperationException("Cannot delete the only remaining active Administrator.");
            }
        }

        // Soft deletion preserving historical relations and referential integrity
        var deleted = await _userRepository.SoftDeleteUserAsync(targetUserId);
        if (deleted)
        {
            _logger.LogInformation("Admin {AdminId} safely soft-deleted user {UserId} ({Email}).", currentAdminUserId, targetUserId, targetUser.Email);
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

