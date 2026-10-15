using System.ComponentModel.DataAnnotations;

namespace ReservationService.DTOs;

public class CreateReservationPreOrderRequest
{
    [Required]
    public int ReservationId { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateReservationPreOrderItemRequest> Items { get; set; } = [];
}

public class CreateReservationPreOrderItemRequest
{
    [Required]
    public int MenuItemId { get; set; }

    [Required]
    [Range(1, 99)]
    public int Quantity { get; set; }
}
