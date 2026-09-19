namespace ReservationService.DTOs;

public sealed class OrderCartResponseDto
{
    public int CartId { get; init; }

    public int CustomerId { get; init; }

    public List<OrderCartItemResponseDto> Items { get; init; } = new();

    public decimal Total { get; init; }
}