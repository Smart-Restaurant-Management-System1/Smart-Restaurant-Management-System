using ReservationService.Models;

namespace ReservationService.Repositories;

public interface ITableRepository
{
    Task<RestaurantTable> CreateTableAsync(RestaurantTable table, CancellationToken cancellationToken = default);
    Task<bool> ExistsByTableNumberAsync(string tableNumber, CancellationToken cancellationToken = default);
    Task<IEnumerable<RestaurantTable>> GetAllTablesAsync(bool? activeOnly = null, CancellationToken cancellationToken = default);
    Task<RestaurantTable?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<RestaurantTable?> GetByTableNumberAsync(string tableNumber, CancellationToken cancellationToken = default);
    Task<RestaurantTable?> UpdateTableAsync(RestaurantTable table, CancellationToken cancellationToken = default);
    Task<bool> DeleteTableAsync(int id, CancellationToken cancellationToken = default);
}
