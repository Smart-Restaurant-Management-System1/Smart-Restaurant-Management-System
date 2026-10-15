namespace ReservationService.DTOs;

public sealed class OrderCartItemResponseDto
{
    public int CartItemId { get; init; }

    public int MenuItemId { get; init; }

    public string ItemName { get; init; } = string.Empty;

    public string? Description { get; init; }

    public decimal UnitPrice { get; init; }

    public int Quantity { get; init; }

    public decimal Subtotal { get; init; }

    public string Category { get; init; } = string.Empty;

    public string DietaryInfo { get; init; } = string.Empty;

    public string? ImageReference { get; init; }

    public bool IsAvailable { get; init; }
}