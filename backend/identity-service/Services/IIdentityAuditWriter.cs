namespace IdentityService.Services;

/// <summary>
/// Audit logging interface for Identity Service operations (SR-223 / SR-251).
/// Writes append-only records directly to the centralized AdminAuditLogs table.
/// </summary>
public interface IIdentityAuditWriter
{
    Task LogActionAsync(
        string actionType,
        int adminId,
        string adminEmail,
        string targetType,
        string? targetId = null,
        string result = "Success",
        object? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);
}

