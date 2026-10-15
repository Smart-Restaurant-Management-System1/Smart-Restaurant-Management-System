using MySqlConnector;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Repositories;

public sealed class AvailabilityRepository : IAvailabilityRepository
{
    private readonly DatabaseHelper _databaseHelper;
    public AvailabilityRepository(DatabaseHelper databaseHelper) => _databaseHelper = databaseHelper;

    public async Task<IReadOnlyList<AvailableTable>> GetAvailableTablesAsync(AvailabilitySearchCriteria criteria, CancellationToken cancellationToken = default)
    {
        using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        const string sql = @"SELECT t.Id, t.TableNumber, t.Capacity
FROM RestaurantTables AS t
WHERE t.IsActive = @IsActive
  AND t.Capacity >= @GuestCount
  AND NOT EXISTS (
      SELECT 1 FROM Reservations AS r
      WHERE r.TableId = t.Id
        AND r.Status IN (@PendingStatus, @ConfirmedStatus)
        AND r.StartDateTime < @RequestedEnd
        AND r.EndDateTime > @RequestedStart
  )
ORDER BY t.Capacity ASC, t.TableNumber ASC;";

        using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@IsActive", true);
        command.Parameters.AddWithValue("@GuestCount", criteria.GuestCount);
        command.Parameters.AddWithValue("@PendingStatus", "Pending");
        command.Parameters.AddWithValue("@ConfirmedStatus", "Confirmed");
        command.Parameters.AddWithValue("@RequestedStart", criteria.RequestedStart);
        command.Parameters.AddWithValue("@RequestedEnd", criteria.RequestedEnd);

        var tables = new List<AvailableTable>();
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            tables.Add(new AvailableTable
            {
                TableId = reader.GetInt32("Id"),
                TableNumber = reader.GetString("TableNumber"),
                SeatingCapacity = reader.GetInt32("Capacity")
            });
        }
        return tables;
    }
}
