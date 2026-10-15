namespace IdentityService.Models;

/// <summary>
/// Centralized validation rules and constraints for user profile and identity entities.
/// Prevents magic numbers and maintains parity across registration and profile updates.
/// </summary>
public static class UserValidationRules
{
    public const int MaxPhoneNumberLength = 10;
    public const int ExactPhoneNumberLength = 10;
    public const string PhoneLengthErrorMessage = "Phone number must not exceed 10 characters";
    public const string PhoneExactLengthErrorMessage = "Phone number must be exactly 10 digits";
    public const string PhoneFormatErrorMessage = "Invalid phone number format";
}
