using IdentityService.DTOs;

namespace IdentityService.Services;

public interface IUserService
{
    Task<UserResponseDto?> GetProfileAsync(int userId);
    Task<UserResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequestDto request);
    Task<AdminUserListResponseDto> GetAdminUsersAsync(AdminUserQueryDto query);
    Task<UserResponseDto?> GetUserByIdAsync(int userId);
    Task<UserResponseDto> UpdateUserStatusAsync(int targetUserId, int currentAdminUserId, string status, string? reason);
    Task<bool> DeleteUserAsync(int targetUserId, int currentAdminUserId);
}

