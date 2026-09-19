
using ReservationService.Models;

namespace ReservationService.Services;

public interface IOrderCartService
{
    Task<OrderCart?> GetCartAsync(
        int customerId,
        CancellationToken cancellationToken = default);

    Task<OrderCart> AddItemAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default);

    Task<OrderCart> UpdateItemQuantityAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default);

    Task<OrderCart> RemoveItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default);

    Task<OrderCart> ClearCartAsync(
        int customerId,
        CancellationToken cancellationToken = default);
}