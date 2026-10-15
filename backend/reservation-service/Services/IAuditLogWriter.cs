using ReservationService.Models;

namespace ReservationService.Services;

/// <summary>
/// Reusable audit-writer interface for recording administrative operations (SR-223 / SR-250).
/// Guarantees data sanitization and append-only immutability.
/// </summary>
public interface IAuditLogWriter
{
    Task LogAsync(
        string actionType,
        int adminId,
        string adminEmail,
        string targetType,
        string? targetId = null,
        string result = AuditActionTypes.Results.Success,
        object? details = null,
        string adminRole = "Admin",
        string sourceService = AuditActionTypes.Services.ReservationService,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);
}

