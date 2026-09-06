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

    private static UserResponseDto MapToDto(User user)
    {
        return new UserResponseDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            Roles = user.Roles,
            CreatedAt = user.CreatedAt
        };
    }
}
