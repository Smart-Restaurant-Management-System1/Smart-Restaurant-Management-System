using IdentityService.DTOs;
using IdentityService.Models;

namespace IdentityService.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(int userId);
    Task<int> CreateUserWithRoleAsync(User user, string roleName);
    Task<List<string>> GetUserRolesAsync(int userId);
    Task<bool> UpdateUserProfileAsync(int userId, string fullName, string email, string? phoneNumber);
    Task<(List<User> Users, int TotalCount, AdminUserMetricsDto Metrics)> GetUsersPagedAsync(string? search, string? role, string? status, int page, int pageSize);
    Task<bool> UpdateUserStatusAsync(int userId, string status, bool isActive);
    Task<bool> SoftDeleteUserAsync(int userId);
    Task<int> GetActiveAdminCountAsync();
    Task<bool> IsUserActiveAsync(int userId);
    Task<bool> UpdatePasswordHashAsync(int userId, string passwordHash);
}
