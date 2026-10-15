namespace ReservationService.DTOs;

public sealed class AvailableTableResponseDto
{
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public int SeatingCapacity { get; init; }
}
