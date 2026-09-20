namespace ReservationService.DTOs;

public sealed class KitchenQueueOrderDto
{
    public string OrderReference { get; init; } = string.Empty;

    public string OrderType { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public DateTime SubmittedAt { get; init; }

    public int? TableId { get; init; }

    public int? ReservationId { get; init; }

    public decimal TotalAmount { get; init; }

    public List<KitchenQueueItemDto> Items { get; init; } = new();
}

public sealed class KitchenQueueItemDto
{
    public int OrderItemId { get; init; }

    public int MenuItemId { get; init; }

    public string ItemName { get; init; } = string.Empty;

    public int Quantity { get; init; }

    public decimal UnitPrice { get; init; }

    public decimal Subtotal { get; init; }
}

public sealed class KitchenQueueResponseDto
{
    public DateTime RetrievedAt { get; init; }

    public int Count { get; init; }

    public List<KitchenQueueOrderDto> Orders { get; init; } = new();
}
