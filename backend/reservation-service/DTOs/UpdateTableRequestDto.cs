using System.ComponentModel.DataAnnotations;

namespace ReservationService.DTOs;

public class UpdateTableRequestDto
{
    [Range(1, 100, ErrorMessage = "Capacity must be between 1 and 100.")]
    public int Capacity { get; set; }

    [Required(ErrorMessage = "Location is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Location must be between 1 and 100 characters.")]
    public string Location { get; set; } = string.Empty;

    public string? TableNumber { get; set; }

    public string? Status { get; set; } = "Available";
}
