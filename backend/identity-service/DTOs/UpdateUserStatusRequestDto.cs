using System.ComponentModel.DataAnnotations;

namespace IdentityService.DTOs;

public class UpdateUserStatusRequestDto
{
    [Required]
    [RegularExpression("^(Active|Blocked|Inactive)$", ErrorMessage = "Status must be either 'Active', 'Blocked', or 'Inactive'.")]
    public string Status { get; set; } = string.Empty;

    public string? Reason { get; set; }
}
