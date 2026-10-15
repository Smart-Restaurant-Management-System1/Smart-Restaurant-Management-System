namespace ReservationService.Models;

public sealed class AvailableTable
{
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public int SeatingCapacity { get; init; }
}
