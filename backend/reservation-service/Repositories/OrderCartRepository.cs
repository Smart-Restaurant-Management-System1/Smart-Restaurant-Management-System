using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Repositories;

public class OrderCartRepository : IOrderCartRepository
{
    private readonly DatabaseHelper _databaseHelper;

    public OrderCartRepository(DatabaseHelper databaseHelper)
    {
        _databaseHelper = databaseHelper;
    }

    public async Task<OrderCart?> GetByCustomerIdAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                c.CartId,
                c.CustomerId,
                c.CreatedAt,
                c.UpdatedAt,
                ci.CartItemId,
                ci.MenuItemId,
                ci.Quantity,
                ci.CreatedAt AS ItemCreatedAt,
                ci.UpdatedAt AS ItemUpdatedAt,
                m.ItemName,
                m.Description,
                m.Price AS UnitPrice,
                m.Category,
                m.DietaryInfo,
                m.ImageReference,
                m.IsAvailable
            FROM OrderCarts c
            LEFT JOIN OrderCartItems ci
                ON c.CartId = ci.CartId
            LEFT JOIN MenuItems m
                ON ci.MenuItemId = m.MenuItemId
            WHERE c.CustomerId = @CustomerId
            ORDER BY ci.CartItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        OrderCart? cart = null;

        while (await reader.ReadAsync(cancellationToken))
        {
            cart ??= new OrderCart
            {
                CartId = reader.GetInt32("CartId"),
                CustomerId = reader.GetInt32("CustomerId"),
                CreatedAt = reader.GetDateTime("CreatedAt"),
                UpdatedAt = reader.GetDateTime("UpdatedAt")
            };

            if (reader.IsDBNull(reader.GetOrdinal("CartItemId")))
            {
                continue;
            }

            cart.Items.Add(new OrderCartItem
            {
                CartItemId = reader.GetInt32("CartItemId"),
                CartId = cart.CartId,
                MenuItemId = reader.GetInt32("MenuItemId"),
                Quantity = reader.GetInt32("Quantity"),
                CreatedAt = reader.GetDateTime("ItemCreatedAt"),
                UpdatedAt = reader.GetDateTime("ItemUpdatedAt"),
                ItemName = reader.GetString("ItemName"),
                Description = reader.IsDBNull(
                    reader.GetOrdinal("Description"))
                    ? null
                    : reader.GetString("Description"),
                UnitPrice = reader.GetDecimal("UnitPrice"),
                Category = reader.GetString("Category"),
                DietaryInfo = reader.GetString("DietaryInfo"),
                ImageReference = reader.IsDBNull(
                    reader.GetOrdinal("ImageReference"))
                    ? null
                    : reader.GetString("ImageReference"),
                IsAvailable = reader.GetBoolean("IsAvailable")
            });
        }

        return cart;
    }

    public async Task<OrderCartItem?> GetItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                ci.CartItemId,
                ci.CartId,
                ci.MenuItemId,
                ci.Quantity,
                ci.CreatedAt,
                ci.UpdatedAt,
                m.ItemName,
                m.Description,
                m.Price AS UnitPrice,
                m.Category,
                m.DietaryInfo,
                m.ImageReference,
                m.IsAvailable
            FROM OrderCartItems ci
            INNER JOIN OrderCarts c
                ON ci.CartId = c.CartId
            INNER JOIN MenuItems m
                ON ci.MenuItemId = m.MenuItemId
            WHERE c.CustomerId = @CustomerId
              AND ci.MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@MenuItemId", menuItemId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapCartItem(reader);
    }

    public async Task<bool> AddItemAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO OrderCarts (CustomerId)
            VALUES (@CustomerId)
            ON DUPLICATE KEY UPDATE
                UpdatedAt = CURRENT_TIMESTAMP;

            INSERT INTO OrderCartItems
                (CartId, MenuItemId, Quantity)
            SELECT
                CartId,
                @MenuItemId,
                @Quantity
            FROM OrderCarts
            WHERE CustomerId = @CustomerId
            ON DUPLICATE KEY UPDATE
                Quantity = Quantity + @Quantity,
                UpdatedAt = CURRENT_TIMESTAMP;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@MenuItemId", menuItemId);
        command.Parameters.AddWithValue("@Quantity", quantity);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> UpdateItemQuantityAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE OrderCartItems ci
            INNER JOIN OrderCarts c
                ON ci.CartId = c.CartId
            SET
                ci.Quantity = @Quantity,
                ci.UpdatedAt = CURRENT_TIMESTAMP
            WHERE c.CustomerId = @CustomerId
              AND ci.MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@MenuItemId", menuItemId);
        command.Parameters.AddWithValue("@Quantity", quantity);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> RemoveItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE ci
            FROM OrderCartItems ci
            INNER JOIN OrderCarts c
                ON ci.CartId = c.CartId
            WHERE c.CustomerId = @CustomerId
              AND ci.MenuItemId = @MenuItemId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@MenuItemId", menuItemId);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> ClearCartAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE ci
            FROM OrderCartItems ci
            INNER JOIN OrderCarts c
                ON ci.CartId = c.CartId
            WHERE c.CustomerId = @CustomerId;
            """;

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@CustomerId", customerId);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    private static OrderCartItem MapCartItem(
        MySqlDataReader reader)
    {
        return new OrderCartItem
        {
            CartItemId = reader.GetInt32("CartItemId"),
            CartId = reader.GetInt32("CartId"),
            MenuItemId = reader.GetInt32("MenuItemId"),
            Quantity = reader.GetInt32("Quantity"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt"),
            ItemName = reader.GetString("ItemName"),
            Description = reader.IsDBNull(
                reader.GetOrdinal("Description"))
                ? null
                : reader.GetString("Description"),
            UnitPrice = reader.GetDecimal("UnitPrice"),
            Category = reader.GetString("Category"),
            DietaryInfo = reader.GetString("DietaryInfo"),
            ImageReference = reader.IsDBNull(
                reader.GetOrdinal("ImageReference"))
                ? null
                : reader.GetString("ImageReference"),
            IsAvailable = reader.GetBoolean("IsAvailable")
        };
    }
}