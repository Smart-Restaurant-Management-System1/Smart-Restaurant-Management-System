using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IOrderCartRepository
{
    Task<OrderCart?> GetByCustomerIdAsync(
        int customerId,
        CancellationToken cancellationToken = default);

    Task<OrderCartItem?> GetItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default);

    Task<bool> AddItemAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateItemQuantityAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default);

    Task<bool> RemoveItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default);

    Task<bool> ClearCartAsync(
        int customerId,
        CancellationToken cancellationToken = default);
}