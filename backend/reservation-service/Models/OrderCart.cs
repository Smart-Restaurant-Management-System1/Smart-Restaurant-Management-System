namespace ReservationService.Models;

public class OrderCart
{
    public int CartId { get; set; }

    public int CustomerId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public List<OrderCartItem> Items { get; set; } = new();
}