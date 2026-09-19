namespace ReservationService.Models;

public class OrderCartItem
{
    public int CartItemId { get; set; }

    public int CartId { get; set; }

    public int MenuItemId { get; set; }

    public int Quantity { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // Current menu item information retrieved from the database.
    public string ItemName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal UnitPrice { get; set; }

    public string Category { get; set; } = string.Empty;

    public string DietaryInfo { get; set; } = string.Empty;

    public string? ImageReference { get; set; }

    public bool IsAvailable { get; set; }

    public decimal Subtotal => UnitPrice * Quantity;
}