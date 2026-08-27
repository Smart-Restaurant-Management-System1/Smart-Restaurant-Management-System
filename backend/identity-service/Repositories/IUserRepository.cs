using IdentityService.Models;

namespace IdentityService.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(int userId);
    Task<int> CreateUserWithRoleAsync(User user, string roleName);
    Task<List<string>> GetUserRolesAsync(int userId);
}
