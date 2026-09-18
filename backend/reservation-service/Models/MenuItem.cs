namespace ReservationService.Models;

public class MenuItem
{
    public int MenuItemId { get; set; }

    public string ItemName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string Category { get; set; } = string.Empty;

    public string DietaryInfo { get; set; } = string.Empty;

    public string? ImageReference { get; set; }

    public bool IsAvailable { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
