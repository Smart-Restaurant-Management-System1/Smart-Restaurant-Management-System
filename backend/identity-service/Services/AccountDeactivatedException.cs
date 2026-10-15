using System;

namespace IdentityService.Services;

/// <summary>
/// Thrown when a user account has been deactivated, soft-deleted, or blocked by administration.
/// </summary>
public class AccountDeactivatedException : UnauthorizedAccessException
{
    public string Reason { get; }

    public AccountDeactivatedException(string message, string reason = "Blocked")
        : base(message)
    {
        Reason = reason;
    }
}

