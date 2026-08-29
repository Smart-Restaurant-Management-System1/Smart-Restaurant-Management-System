using IdentityService.DTOs;

namespace IdentityService.Services;

public interface IAuthService
{
    Task<UserResponseDto> RegisterAsync(RegisterRequestDto request);
}
