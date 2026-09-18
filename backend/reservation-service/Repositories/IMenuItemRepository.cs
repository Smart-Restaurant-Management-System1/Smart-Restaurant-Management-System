using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IMenuItemRepository
{
    Task<List<MenuItem>> GetAllAsync(
        string? search = null,
        string? category = null,
        bool? isAvailable = null,
        CancellationToken cancellationToken = default);

    Task<MenuItem?> GetByIdAsync(
        int menuItemId,
        CancellationToken cancellationToken = default);

    Task<int> CreateAsync(
        MenuItem menuItem,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(
        int menuItemId,
        MenuItem menuItem,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAvailabilityAsync(
        int menuItemId,
        bool isAvailable,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int menuItemId,
        CancellationToken cancellationToken = default);
}