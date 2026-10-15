
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public class OrderCartService : IOrderCartService
{
    private readonly IOrderCartRepository _cartRepository;
    private readonly IMenuItemRepository _menuItemRepository;

    public OrderCartService(
        IOrderCartRepository cartRepository,
        IMenuItemRepository menuItemRepository)
    {
        _cartRepository = cartRepository;
        _menuItemRepository = menuItemRepository;
    }

    public async Task<OrderCart?> GetCartAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        ValidateCustomerId(customerId);

        return await _cartRepository.GetByCustomerIdAsync(
            customerId,
            cancellationToken);
    }

    public async Task<OrderCart> AddItemAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        ValidateCustomerId(customerId);
        ValidateMenuItemId(menuItemId);
        ValidateQuantity(quantity);

        var menuItem = await GetAvailableMenuItemAsync(
            menuItemId,
            cancellationToken);

        var existingItem = await _cartRepository.GetItemAsync(
            customerId,
            menuItemId,
            cancellationToken);

        if (existingItem != null)
        {
            var newQuantity = existingItem.Quantity + quantity;

            ValidateQuantity(newQuantity);
        }

        var added = await _cartRepository.AddItemAsync(
            customerId,
            menuItem.MenuItemId,
            quantity,
            cancellationToken);

        if (!added)
        {
            throw new InvalidOperationException(
                "The menu item could not be added to the cart.");
        }

        return await GetRequiredCartAsync(
            customerId,
            cancellationToken);
    }

    public async Task<OrderCart> UpdateItemQuantityAsync(
        int customerId,
        int menuItemId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        ValidateCustomerId(customerId);
        ValidateMenuItemId(menuItemId);
        ValidateQuantity(quantity);

        await GetAvailableMenuItemAsync(
            menuItemId,
            cancellationToken);

        var existingItem = await _cartRepository.GetItemAsync(
            customerId,
            menuItemId,
            cancellationToken);

        if (existingItem == null)
        {
            throw new KeyNotFoundException(
                "The menu item does not exist in the cart.");
        }

        var updated = await _cartRepository.UpdateItemQuantityAsync(
            customerId,
            menuItemId,
            quantity,
            cancellationToken);

        if (!updated)
        {
            throw new InvalidOperationException(
                "The cart item quantity could not be updated.");
        }

        return await GetRequiredCartAsync(
            customerId,
            cancellationToken);
    }

    public async Task<OrderCart> RemoveItemAsync(
        int customerId,
        int menuItemId,
        CancellationToken cancellationToken = default)
    {
        ValidateCustomerId(customerId);
        ValidateMenuItemId(menuItemId);

        var existingItem = await _cartRepository.GetItemAsync(
            customerId,
            menuItemId,
            cancellationToken);

        if (existingItem == null)
        {
            throw new KeyNotFoundException(
                "The menu item does not exist in the cart.");
        }

        var removed = await _cartRepository.RemoveItemAsync(
            customerId,
            menuItemId,
            cancellationToken);

        if (!removed)
        {
            throw new InvalidOperationException(
                "The cart item could not be removed.");
        }

        return await GetRequiredCartAsync(
            customerId,
            cancellationToken);
    }

    public async Task<OrderCart> ClearCartAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        ValidateCustomerId(customerId);

        var cart = await _cartRepository.GetByCustomerIdAsync(
            customerId,
            cancellationToken);

        if (cart == null || cart.Items.Count == 0)
        {
            return new OrderCart
            {
                CustomerId = customerId
            };
        }

        await _cartRepository.ClearCartAsync(
            customerId,
            cancellationToken);

        return new OrderCart
        {
            CustomerId = customerId
        };
    }

    private async Task<MenuItem> GetAvailableMenuItemAsync(
        int menuItemId,
        CancellationToken cancellationToken)
    {
        var menuItem = await _menuItemRepository.GetByIdAsync(
            menuItemId,
            cancellationToken);

        if (menuItem == null)
        {
            throw new KeyNotFoundException(
                "The requested menu item was not found.");
        }

        if (!menuItem.IsAvailable)
        {
            throw new InvalidOperationException(
                "The requested menu item is currently unavailable.");
        }

        return menuItem;
    }

    private async Task<OrderCart> GetRequiredCartAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var cart = await _cartRepository.GetByCustomerIdAsync(
            customerId,
            cancellationToken);

        if (cart == null)
        {
            throw new InvalidOperationException(
                "The cart could not be retrieved after the operation.");
        }

        return cart;
    }

    private static void ValidateCustomerId(int customerId)
    {
        if (customerId <= 0)
        {
            throw new ArgumentException(
                "A valid customer ID is required.");
        }
    }

    private static void ValidateMenuItemId(int menuItemId)
    {
        if (menuItemId <= 0)
        {
            throw new ArgumentException(
                "A valid menu item ID is required.");
        }
    }

    private static void ValidateQuantity(int quantity)
    {
        const int maximumQuantity = 99;

        if (quantity <= 0 || quantity > maximumQuantity)
        {
            throw new ArgumentException(
                $"Quantity must be between 1 and {maximumQuantity}.");
        }
    }
}