using IdentityService.DTOs;

namespace IdentityService.Services;

public interface IUserService
{
    Task<UserResponseDto?> GetProfileAsync(int userId);
    Task<UserResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
}
