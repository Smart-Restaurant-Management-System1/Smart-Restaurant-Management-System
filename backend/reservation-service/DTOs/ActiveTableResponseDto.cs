namespace ReservationService.DTOs;

/// <summary>
/// Read-only physical-table information for customer and staff views.
/// Administrative and audit fields are deliberately excluded.
/// </summary>
public class ActiveTableResponseDto
{
    public int TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public int SeatingCapacity { get; set; }
    public string OperationalStatus { get; set; } = "Available";
}
