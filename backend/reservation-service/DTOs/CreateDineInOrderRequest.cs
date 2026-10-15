namespace ReservationService.DTOs;

public sealed class CreateDineInOrderRequest
{
    public int TableId { get; init; }

    public List<DineInOrderItemRequest> Items { get; init; } = [];
}

public sealed class DineInOrderItemRequest
{
    public int MenuItemId { get; init; }

    public int Quantity { get; init; }
}
