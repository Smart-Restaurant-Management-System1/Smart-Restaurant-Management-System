using System.Data;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Exceptions;
using ReservationService.Models;

namespace ReservationService.Repositories;

public class TableRepository : ITableRepository
{
    private readonly DatabaseHelper _dbHelper;
    private readonly ILogger<TableRepository> _logger;

    public TableRepository(DatabaseHelper dbHelper, ILogger<TableRepository> logger)
    {
        _dbHelper = dbHelper;
        _logger = logger;
    }

    public async Task<RestaurantTable> CreateTableAsync(RestaurantTable table, CancellationToken cancellationToken = default)
    {
        // Friendly duplicate pre-check
        if (await ExistsByTableNumberAsync(table.TableNumber, cancellationToken))
        {
            throw new DuplicateTableNumberException(table.TableNumber);
        }

        using var connection = await _dbHelper.CreateConnectionAsync(cancellationToken);
        const string insertSql = @"INSERT INTO RestaurantTables (TableNumber, Capacity, Location, IsActive, CreatedAt, UpdatedAt)
                                  VALUES (@TableNumber, @Capacity, @Location, @IsActive, @CreatedAt, @UpdatedAt);
                                  SELECT LAST_INSERT_ID();";

        using var cmd = new MySqlCommand(insertSql, connection);
        cmd.Parameters.AddWithValue("@TableNumber", table.TableNumber.Trim());
        cmd.Parameters.AddWithValue("@Capacity", table.Capacity);
        cmd.Parameters.AddWithValue("@Location", table.Location.Trim());
        cmd.Parameters.AddWithValue("@IsActive", table.IsActive);
        cmd.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
        cmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

        try
        {
            var generatedIdObj = await cmd.ExecuteScalarAsync(cancellationToken);
            table.Id = Convert.ToInt32(generatedIdObj);
            table.CreatedAt = DateTime.UtcNow;
            table.UpdatedAt = DateTime.UtcNow;
            return table;
        }
        catch (MySqlException ex) when (ex.Number == 1062) // MySQL duplicate key error code
        {
            _logger.LogWarning("Database unique constraint prevented duplicate table number: {TableNumber}", table.TableNumber);
            throw new DuplicateTableNumberException(table.TableNumber);
        }
    }

    public async Task<bool> ExistsByTableNumberAsync(string tableNumber, CancellationToken cancellationToken = default)
    {
        using var connection = await _dbHelper.CreateConnectionAsync(cancellationToken);
        const string query = @"SELECT COUNT(1) FROM RestaurantTables WHERE TableNumber = @TableNumber LIMIT 1;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@TableNumber", tableNumber.Trim());

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result) > 0;
    }

    public async Task<IEnumerable<RestaurantTable>> GetAllTablesAsync(bool? activeOnly = null, CancellationToken cancellationToken = default)
    {
        using var connection = await _dbHelper.CreateConnectionAsync(cancellationToken);
        var query = "SELECT Id, TableNumber, Capacity, Location, IsActive, CreatedAt, UpdatedAt FROM RestaurantTables";
        if (activeOnly.HasValue)
        {
            query += " WHERE IsActive = @IsActive";
        }
        query += " ORDER BY TableNumber ASC;";

        using var cmd = new MySqlCommand(query, connection);
        if (activeOnly.HasValue)
        {
            cmd.Parameters.AddWithValue("@IsActive", activeOnly.Value);
        }

        var tables = new List<RestaurantTable>();
        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            tables.Add(MapTable(reader));
        }

        return tables;
    }

    public async Task<RestaurantTable?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        using var connection = await _dbHelper.CreateConnectionAsync(cancellationToken);
        const string query = @"SELECT Id, TableNumber, Capacity, Location, IsActive, CreatedAt, UpdatedAt 
                               FROM RestaurantTables 
                               WHERE Id = @Id LIMIT 1;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@Id", id);

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapTable(reader);
        }

        return null;
    }

    public async Task<RestaurantTable?> GetByTableNumberAsync(string tableNumber, CancellationToken cancellationToken = default)
    {
        using var connection = await _dbHelper.CreateConnectionAsync(cancellationToken);
        const string query = @"SELECT Id, TableNumber, Capacity, Location, IsActive, CreatedAt, UpdatedAt 
                               FROM RestaurantTables 
                               WHERE TableNumber = @TableNumber LIMIT 1;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@TableNumber", tableNumber.Trim());

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapTable(reader);
        }

        return null;
    }

    private static RestaurantTable MapTable(MySqlDataReader reader)
    {
        return new RestaurantTable
        {
            Id = reader.GetInt32("Id"),
            TableNumber = reader.GetString("TableNumber"),
            Capacity = reader.GetInt32("Capacity"),
            Location = reader.GetString("Location"),
            IsActive = reader.GetBoolean("IsActive"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };
    }
}
