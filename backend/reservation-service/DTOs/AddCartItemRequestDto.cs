namespace ReservationService.DTOs;

public sealed class AddCartItemRequestDto
{
    public int MenuItemId { get; init; }

    public int Quantity { get; init; }
}