namespace IdentityService.Services;

/// <summary>
/// Service interface for validating email deliverability, syntax, and blocking disposable/temporary domains (SR-296).
/// </summary>
public interface IEmailValidatorService
{
    /// <summary>
    /// Validates that the email has valid format, is not from a disposable domain, and resolves to an active host/mail exchanger.
    /// Throws InvalidOperationException if validation fails.
    /// </summary>
    Task ValidateEmailDeliverabilityAsync(string email);

    /// <summary>
    /// Checks if the domain matches known throwaway, temporary, or disposable email services.
    /// </summary>
    bool IsDisposableDomain(string domain);

    /// <summary>
    /// Asynchronously checks if the domain exists on internet DNS and can receive mail.
    /// </summary>
    Task<bool> IsDomainDeliverableAsync(string domain);
}

