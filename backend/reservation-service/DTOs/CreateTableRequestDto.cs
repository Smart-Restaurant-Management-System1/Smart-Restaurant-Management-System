using System.ComponentModel.DataAnnotations;

namespace ReservationService.DTOs;

public class CreateTableRequestDto
{
    [Required(ErrorMessage = "Table number is required.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "Table number must be between 1 and 20 characters.")]
    public string TableNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Capacity is required.")]
    [Range(1, 100, ErrorMessage = "Capacity must be between 1 and 100.")]
    public int Capacity { get; set; }

    [Required(ErrorMessage = "Location is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Location must be between 1 and 100 characters.")]
    public string Location { get; set; } = string.Empty;

    public string? Status { get; set; } = "Available";
}
