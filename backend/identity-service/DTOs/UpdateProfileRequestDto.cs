using System.ComponentModel.DataAnnotations;
using IdentityService.Models;

namespace IdentityService.DTOs;

public class UpdateProfileRequestDto : IValidatableObject
{
    [Required(ErrorMessage = "Full name is required")]
    [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters")]
    public string Email { get; set; } = string.Empty;

    private string? _phoneNumber;

    [StringLength(UserValidationRules.MaxPhoneNumberLength, ErrorMessage = UserValidationRules.PhoneLengthErrorMessage)]
    public string? PhoneNumber
    {
        get => _phoneNumber;
        set => _phoneNumber = value?.Trim();
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var trimmed = PhoneNumber?.Trim();
        if (!string.IsNullOrEmpty(trimmed))
        {
            if (trimmed.Length > UserValidationRules.MaxPhoneNumberLength)
            {
                yield return new ValidationResult(
                    UserValidationRules.PhoneLengthErrorMessage,
                    new[] { nameof(PhoneNumber) });
            }
            else if (trimmed.Length < UserValidationRules.ExactPhoneNumberLength)
            {
                yield return new ValidationResult(
                    UserValidationRules.PhoneExactLengthErrorMessage,
                    new[] { nameof(PhoneNumber) });
            }
            else if (!trimmed.All(char.IsDigit))
            {
                yield return new ValidationResult(
                    UserValidationRules.PhoneFormatErrorMessage,
                    new[] { nameof(PhoneNumber) });
            }
        }
    }
}

