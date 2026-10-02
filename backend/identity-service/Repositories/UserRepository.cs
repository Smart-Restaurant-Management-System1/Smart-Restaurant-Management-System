using System.Data;
using IdentityService.Data;
using IdentityService.DTOs;
using IdentityService.Models;
using MySqlConnector;

namespace IdentityService.Repositories;

public class UserRepository : IUserRepository
{
    private readonly DatabaseHelper _dbHelper;

    public UserRepository(DatabaseHelper dbHelper)
    {
        _dbHelper = dbHelper;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"SELECT UserId, FullName, Email, PhoneNumber, PasswordHash, IsActive, Status, CreatedAt, UpdatedAt, DeletedAt 
                               FROM Users 
                               WHERE Email = @Email LIMIT 1;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@Email", email.Trim().ToLowerInvariant());

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var user = MapUser(reader);
            await reader.CloseAsync();
            user.Roles = await GetUserRolesAsync(user.UserId);
            return user;
        }

        return null;
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"SELECT UserId, FullName, Email, PhoneNumber, PasswordHash, IsActive, Status, CreatedAt, UpdatedAt, DeletedAt 
                               FROM Users 
                               WHERE UserId = @UserId LIMIT 1;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@UserId", userId);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var user = MapUser(reader);
            await reader.CloseAsync();
            user.Roles = await GetUserRolesAsync(user.UserId);
            return user;
        }

        return null;
    }

    public async Task<int> CreateUserWithRoleAsync(User user, string roleName)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        using var transaction = await connection.BeginTransactionAsync();

        try
        {
            // 1. Insert User
            const string insertUserSql = @"INSERT INTO Users (FullName, Email, PhoneNumber, PasswordHash, IsActive, Status, CreatedAt, UpdatedAt)
                                          VALUES (@FullName, @Email, @PhoneNumber, @PasswordHash, @IsActive, @Status, @CreatedAt, @UpdatedAt);
                                          SELECT LAST_INSERT_ID();";

            using var userCmd = new MySqlCommand(insertUserSql, connection, transaction);
            userCmd.Parameters.AddWithValue("@FullName", user.FullName.Trim());
            userCmd.Parameters.AddWithValue("@Email", user.Email.Trim().ToLowerInvariant());
            userCmd.Parameters.AddWithValue("@PhoneNumber", (object?)user.PhoneNumber ?? DBNull.Value);
            userCmd.Parameters.AddWithValue("@PasswordHash", user.PasswordHash);
            userCmd.Parameters.AddWithValue("@IsActive", user.IsActive);
            userCmd.Parameters.AddWithValue("@Status", string.IsNullOrWhiteSpace(user.Status) ? (user.IsActive ? "Active" : "Inactive") : user.Status);
            userCmd.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
            userCmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

            var newUserId = Convert.ToInt32(await userCmd.ExecuteScalarAsync());

            // 2. Find RoleId
            const string findRoleSql = @"SELECT RoleId FROM Roles WHERE RoleName = @RoleName LIMIT 1;";
            using var roleCmd = new MySqlCommand(findRoleSql, connection, transaction);
            roleCmd.Parameters.AddWithValue("@RoleName", string.IsNullOrWhiteSpace(roleName) ? "Customer" : roleName.Trim());

            var roleIdObj = await roleCmd.ExecuteScalarAsync();
            int roleId = roleIdObj != null ? Convert.ToInt32(roleIdObj) : 1; // Default to RoleId 1 (Customer)

            // 3. Insert UserRoles mapping
            const string insertUserRoleSql = @"INSERT INTO UserRoles (UserId, RoleId, AssignedAt)
                                              VALUES (@UserId, @RoleId, @AssignedAt);";
            using var userRoleCmd = new MySqlCommand(insertUserRoleSql, connection, transaction);
            userRoleCmd.Parameters.AddWithValue("@UserId", newUserId);
            userRoleCmd.Parameters.AddWithValue("@RoleId", roleId);
            userRoleCmd.Parameters.AddWithValue("@AssignedAt", DateTime.UtcNow);

            await userRoleCmd.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return newUserId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<string>> GetUserRolesAsync(int userId)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"SELECT r.RoleName 
                               FROM Roles r 
                               INNER JOIN UserRoles ur ON r.RoleId = ur.RoleId 
                               WHERE ur.UserId = @UserId;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@UserId", userId);

        var roles = new List<string>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            roles.Add(reader.GetString("RoleName"));
        }

        return roles;
    }

    public async Task<bool> UpdateUserProfileAsync(int userId, string fullName, string email, string? phoneNumber)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"UPDATE Users 
                               SET FullName = @FullName, 
                                   Email = @Email, 
                                   PhoneNumber = @PhoneNumber, 
                                   UpdatedAt = @UpdatedAt 
                               WHERE UserId = @UserId;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@UserId", userId);
        cmd.Parameters.AddWithValue("@FullName", fullName.Trim());
        cmd.Parameters.AddWithValue("@Email", email.Trim().ToLowerInvariant());
        cmd.Parameters.AddWithValue("@PhoneNumber", string.IsNullOrWhiteSpace(phoneNumber) ? (object)DBNull.Value : phoneNumber.Trim());
        cmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

        var rowsAffected = await cmd.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<(List<User> Users, int TotalCount, AdminUserMetricsDto Metrics)> GetUsersPagedAsync(
        string? search,
        string? role,
        string? status,
        int page,
        int pageSize)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();

        // 1. Calculate system-wide User metrics
        var metrics = new AdminUserMetricsDto();
        const string metricsQuery = @"
            SELECT 
                COUNT(DISTINCT u.UserId) AS TotalUsers,
                COUNT(DISTINCT CASE WHEN r.RoleName = 'Customer' THEN u.UserId END) AS TotalCustomers,
                COUNT(DISTINCT CASE WHEN r.RoleName IN ('Admin', 'KitchenStaff') THEN u.UserId END) AS TotalStaff,
                COUNT(DISTINCT CASE WHEN u.Status = 'Active' THEN u.UserId END) AS TotalActive,
                COUNT(DISTINCT CASE WHEN u.Status = 'Blocked' THEN u.UserId END) AS TotalBlocked,
                COUNT(DISTINCT CASE WHEN u.Status = 'Inactive' THEN u.UserId END) AS TotalInactive
            FROM Users u
            LEFT JOIN UserRoles ur ON u.UserId = ur.UserId
            LEFT JOIN Roles r ON ur.RoleId = r.RoleId;";

        using (var metricsCmd = new MySqlCommand(metricsQuery, connection))
        using (var metricsReader = await metricsCmd.ExecuteReaderAsync())
        {
            if (await metricsReader.ReadAsync())
            {
                metrics.TotalUsers = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalUsers")) ? 0 : metricsReader.GetInt32("TotalUsers");
                metrics.TotalCustomers = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalCustomers")) ? 0 : metricsReader.GetInt32("TotalCustomers");
                metrics.TotalStaff = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalStaff")) ? 0 : metricsReader.GetInt32("TotalStaff");
                metrics.TotalActive = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalActive")) ? 0 : metricsReader.GetInt32("TotalActive");
                metrics.TotalBlocked = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalBlocked")) ? 0 : metricsReader.GetInt32("TotalBlocked");
                metrics.TotalInactive = metricsReader.IsDBNull(metricsReader.GetOrdinal("TotalInactive")) ? 0 : metricsReader.GetInt32("TotalInactive");
            }
        }

        // 2. Build filtered WHERE clause
        var whereClauses = new List<string>();
        var parameters = new List<MySqlParameter>();

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClauses.Add("(u.FullName LIKE @Search OR u.Email LIKE @Search OR u.PhoneNumber LIKE @Search)");
            parameters.Add(new MySqlParameter("@Search", $"%{search.Trim()}%"));
        }

        if (!string.IsNullOrWhiteSpace(role) && !role.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            whereClauses.Add("r.RoleName = @Role");
            parameters.Add(new MySqlParameter("@Role", role.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            whereClauses.Add("u.Status = @Status");
            parameters.Add(new MySqlParameter("@Status", status.Trim()));
        }

        var whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";

        // 3. Count total matching rows
        var countSql = $@"
            SELECT COUNT(DISTINCT u.UserId) 
            FROM Users u
            LEFT JOIN UserRoles ur ON u.UserId = ur.UserId
            LEFT JOIN Roles r ON ur.RoleId = r.RoleId
            {whereSql};";

        int totalCount = 0;
        using (var countCmd = new MySqlCommand(countSql, connection))
        {
            foreach (var p in parameters) countCmd.Parameters.Add(new MySqlParameter(p.ParameterName, p.Value));
            var countObj = await countCmd.ExecuteScalarAsync();
            totalCount = countObj != null ? Convert.ToInt32(countObj) : 0;
        }

        // 4. Fetch Paged User records
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var dataSql = $@"
            SELECT DISTINCT u.UserId, u.FullName, u.Email, u.PhoneNumber, u.PasswordHash, u.IsActive, u.Status, u.CreatedAt, u.UpdatedAt, u.DeletedAt
            FROM Users u
            LEFT JOIN UserRoles ur ON u.UserId = ur.UserId
            LEFT JOIN Roles r ON ur.RoleId = r.RoleId
            {whereSql}
            ORDER BY u.UserId DESC
            LIMIT @Limit OFFSET @Offset;";

        var users = new List<User>();
        using (var dataCmd = new MySqlCommand(dataSql, connection))
        {
            foreach (var p in parameters) dataCmd.Parameters.Add(new MySqlParameter(p.ParameterName, p.Value));
            dataCmd.Parameters.AddWithValue("@Limit", pageSize);
            dataCmd.Parameters.AddWithValue("@Offset", offset);

            using var reader = await dataCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                users.Add(MapUser(reader));
            }
        }

        // 5. Populate roles for each user
        foreach (var u in users)
        {
            u.Roles = await GetUserRolesAsync(u.UserId);
        }

        return (users, totalCount, metrics);
    }

    public async Task<bool> UpdateUserStatusAsync(int userId, string status, bool isActive)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"UPDATE Users 
                               SET Status = @Status, 
                                   IsActive = @IsActive, 
                                   UpdatedAt = @UpdatedAt 
                               WHERE UserId = @UserId;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@UserId", userId);
        cmd.Parameters.AddWithValue("@Status", status);
        cmd.Parameters.AddWithValue("@IsActive", isActive);
        cmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> SoftDeleteUserAsync(int userId)
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"UPDATE Users 
                               SET Status = 'Inactive', 
                                   IsActive = 0, 
                                   DeletedAt = @DeletedAt, 
                                   UpdatedAt = @UpdatedAt 
                               WHERE UserId = @UserId;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@UserId", userId);
        cmd.Parameters.AddWithValue("@DeletedAt", DateTime.UtcNow);
        cmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<int> GetActiveAdminCountAsync()
    {
        using var connection = await _dbHelper.CreateConnectionAsync();
        const string query = @"SELECT COUNT(DISTINCT u.UserId) 
                               FROM Users u 
                               INNER JOIN UserRoles ur ON u.UserId = ur.UserId 
                               INNER JOIN Roles r ON ur.RoleId = r.RoleId 
                               WHERE r.RoleName = 'Admin' AND u.Status = 'Active' AND u.IsActive = 1;";

        using var cmd = new MySqlCommand(query, connection);
        var countObj = await cmd.ExecuteScalarAsync();
        return countObj != null ? Convert.ToInt32(countObj) : 0;
    }

    private static User MapUser(MySqlDataReader reader)
    {
        var user = new User
        {
            UserId = reader.GetInt32("UserId"),
            FullName = reader.GetString("FullName"),
            Email = reader.GetString("Email"),
            PhoneNumber = reader.IsDBNull(reader.GetOrdinal("PhoneNumber")) ? null : reader.GetString("PhoneNumber"),
            PasswordHash = reader.GetString("PasswordHash"),
            IsActive = reader.GetBoolean("IsActive"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };

        try
        {
            var statusOrd = reader.GetOrdinal("Status");
            user.Status = reader.IsDBNull(statusOrd) ? (user.IsActive ? "Active" : "Inactive") : reader.GetString(statusOrd);
        }
        catch
        {
            user.Status = user.IsActive ? "Active" : "Inactive";
        }

        try
        {
            var deletedOrd = reader.GetOrdinal("DeletedAt");
            user.DeletedAt = reader.IsDBNull(deletedOrd) ? null : reader.GetDateTime(deletedOrd);
        }
        catch
        {
            user.DeletedAt = null;
        }

        return user;
    }
}

