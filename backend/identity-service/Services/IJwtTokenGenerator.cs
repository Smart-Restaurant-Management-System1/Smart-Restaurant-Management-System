using IdentityService.Models;

namespace IdentityService.Services;

public interface IJwtTokenGenerator
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user, IList<string> roles);
}
