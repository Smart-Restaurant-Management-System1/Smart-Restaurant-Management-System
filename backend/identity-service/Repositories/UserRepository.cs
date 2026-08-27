using System.Data;
using IdentityService.Data;
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
        const string query = @"SELECT UserId, FullName, Email, PhoneNumber, PasswordHash, IsActive, CreatedAt, UpdatedAt 
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
        const string query = @"SELECT UserId, FullName, Email, PhoneNumber, PasswordHash, IsActive, CreatedAt, UpdatedAt 
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
            const string insertUserSql = @"INSERT INTO Users (FullName, Email, PhoneNumber, PasswordHash, IsActive, CreatedAt, UpdatedAt)
                                          VALUES (@FullName, @Email, @PhoneNumber, @PasswordHash, @IsActive, @CreatedAt, @UpdatedAt);
                                          SELECT LAST_INSERT_ID();";

            using var userCmd = new MySqlCommand(insertUserSql, connection, transaction);
            userCmd.Parameters.AddWithValue("@FullName", user.FullName.Trim());
            userCmd.Parameters.AddWithValue("@Email", user.Email.Trim().ToLowerInvariant());
            userCmd.Parameters.AddWithValue("@PhoneNumber", (object?)user.PhoneNumber ?? DBNull.Value);
            userCmd.Parameters.AddWithValue("@PasswordHash", user.PasswordHash);
            userCmd.Parameters.AddWithValue("@IsActive", user.IsActive);
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

    private static User MapUser(MySqlDataReader reader)
    {
        return new User
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
    }
}
