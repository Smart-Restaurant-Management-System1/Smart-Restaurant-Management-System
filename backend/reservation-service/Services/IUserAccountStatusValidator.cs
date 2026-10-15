namespace ReservationService.Services;

/// <summary>
/// Service contract to validate that an authenticated user's account is active
/// and has not been blocked or deactivated/deleted by administrators (SR-225 / SR-257).
/// </summary>
public interface IUserAccountStatusValidator
{
    /// <summary>
    /// Checks whether the specified user ID corresponds to an active, non-blocked, non-deleted account.
    /// </summary>
    /// <param name="userId">The user ID extracted from JWT claims.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if the user account is active; otherwise false.</returns>
    Task<bool> IsUserActiveAsync(int userId, CancellationToken cancellationToken = default);
}

