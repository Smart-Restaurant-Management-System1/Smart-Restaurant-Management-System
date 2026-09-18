using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Repositories;

public class MenuItemRepository : IMenuItemRepository
{
    private readonly DatabaseHelper _databaseHelper;

    public MenuItemRepository(DatabaseHelper databaseHelper)
    {
        _databaseHelper = databaseHelper;
    }

    public async Task<List<MenuItem>> GetAllAsync(
        string? search = null,
        string? category = null,
        string? dietaryInfo = null,
        bool? isAvailable = null,
        CancellationToken cancellationToken = default)
    {
        var menuItems = new List<MenuItem>();

        const string sql = """
            SELECT
                MenuItemId,
                ItemName,
                Description,
                Price,
                Category,
                DietaryInfo,
                ImageReference,
                IsAvailable,
                CreatedAt,
                UpdatedAt
            FROM MenuItems
            WHERE
                (@Search IS NULL
                 OR ItemName LIKE CONCAT('%', @Search, '%')
                 OR Description LIKE CONCAT('%', @Search, '%'))
                AND (@Category IS NULL OR Category = @Category)
                AND (@DietaryInfo IS NULL OR DietaryInfo = @DietaryInfo)
                AND (@IsAvailable IS NULL OR IsAvailable = @IsAvailable)
            ORDER BY Category, ItemName;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@Search",
            string.IsNullOrWhiteSpace(search)
                ? DBNull.Value
                : search.Trim());

        command.Parameters.AddWithValue(
            "@Category",
            string.IsNullOrWhiteSpace(category)
                ? DBNull.Value
                : category.Trim());

        command.Parameters.AddWithValue(
            "@DietaryInfo",
            string.IsNullOrWhiteSpace(dietaryInfo)
                ? DBNull.Value
                : dietaryInfo.Trim());

        command.Parameters.AddWithValue(
            "@IsAvailable",
            isAvailable.HasValue
                ? isAvailable.Value
                : DBNull.Value);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            menuItems.Add(MapMenuItem(reader));
        }

        return menuItems;
    }

    public async Task<MenuItem?> GetByIdAsync(
        int menuItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                MenuItemId,
                ItemName,
                Description,
                Price,
                Category,
                DietaryInfo,
                ImageReference,
                IsAvailable,
                CreatedAt,
                UpdatedAt
            FROM MenuItems
            WHERE MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@MenuItemId",
            menuItemId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapMenuItem(reader);
    }

    public async Task<int> CreateAsync(
        MenuItem menuItem,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO MenuItems
            (
                ItemName,
                Description,
                Price,
                Category,
                DietaryInfo,
                ImageReference,
                IsAvailable
            )
            VALUES
            (
                @ItemName,
                @Description,
                @Price,
                @Category,
                @DietaryInfo,
                @ImageReference,
                @IsAvailable
            );

            SELECT LAST_INSERT_ID();
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        AddMenuItemParameters(command, menuItem);

        var result =
            await command.ExecuteScalarAsync(cancellationToken);

        return Convert.ToInt32(result);
    }

    public async Task<bool> UpdateAsync(
        int menuItemId,
        MenuItem menuItem,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE MenuItems
            SET
                ItemName = @ItemName,
                Description = @Description,
                Price = @Price,
                Category = @Category,
                DietaryInfo = @DietaryInfo,
                ImageReference = @ImageReference,
                IsAvailable = @IsAvailable
            WHERE MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        AddMenuItemParameters(command, menuItem);

        command.Parameters.AddWithValue(
            "@MenuItemId",
            menuItemId);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> UpdateAvailabilityAsync(
        int menuItemId,
        bool isAvailable,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE MenuItems
            SET IsAvailable = @IsAvailable
            WHERE MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@MenuItemId",
            menuItemId);

        command.Parameters.AddWithValue(
            "@IsAvailable",
            isAvailable);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> DeleteAsync(
        int menuItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM MenuItems
            WHERE MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@MenuItemId",
            menuItemId);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    private static void AddMenuItemParameters(
        MySqlCommand command,
        MenuItem menuItem)
    {
        command.Parameters.AddWithValue(
            "@ItemName",
            menuItem.ItemName);

        command.Parameters.AddWithValue(
            "@Description",
            string.IsNullOrWhiteSpace(menuItem.Description)
                ? DBNull.Value
                : menuItem.Description);

        command.Parameters.AddWithValue(
            "@Price",
            menuItem.Price);

        command.Parameters.AddWithValue(
            "@Category",
            menuItem.Category);

        command.Parameters.AddWithValue(
            "@DietaryInfo",
            menuItem.DietaryInfo);

        command.Parameters.AddWithValue(
            "@ImageReference",
            string.IsNullOrWhiteSpace(menuItem.ImageReference)
                ? DBNull.Value
                : menuItem.ImageReference);

        command.Parameters.AddWithValue(
            "@IsAvailable",
            menuItem.IsAvailable);
    }

    private static MenuItem MapMenuItem(
        MySqlDataReader reader)
    {
        return new MenuItem
        {
            MenuItemId = reader.GetInt32("MenuItemId"),

            ItemName = reader.GetString("ItemName"),

            Description =
                reader.IsDBNull(
                    reader.GetOrdinal("Description"))
                    ? null
                    : reader.GetString("Description"),

            Price = reader.GetDecimal("Price"),

            Category = reader.GetString("Category"),

            DietaryInfo = reader.GetString("DietaryInfo"),

            ImageReference =
                reader.IsDBNull(
                    reader.GetOrdinal("ImageReference"))
                    ? null
                    : reader.GetString("ImageReference"),

            IsAvailable = reader.GetBoolean("IsAvailable"),

            CreatedAt = reader.GetDateTime("CreatedAt"),

            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };
    }
}