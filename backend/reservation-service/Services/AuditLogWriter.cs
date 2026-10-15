using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

/// <summary>
/// Authoritative implementation of the administrative audit log writer (SR-223 / SR-250).
/// Enforces metadata sanitization and fail-safe operation logging.
/// </summary>
public class AuditLogWriter : IAuditLogWriter
{
    private readonly IAuditLogRepository _repository;
    private readonly ILogger<AuditLogWriter> _logger;

    public AuditLogWriter(IAuditLogRepository repository, ILogger<AuditLogWriter> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task LogAsync(
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
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sanitizedDetails = AuditDataSanitizer.SanitizeAndSerialize(details);

            var entry = new AdminAuditLog
            {
                TimestampUtc = DateTime.UtcNow,
                ActionType = string.IsNullOrWhiteSpace(actionType) ? "UNKNOWN_ACTION" : actionType.Trim(),
                AdminId = adminId,
                AdminEmail = string.IsNullOrWhiteSpace(adminEmail) ? "unknown@cinnamonbistro.com" : adminEmail.Trim(),
                AdminRole = string.IsNullOrWhiteSpace(adminRole) ? "Admin" : adminRole.Trim(),
                TargetType = string.IsNullOrWhiteSpace(targetType) ? "Unknown" : targetType.Trim(),
                TargetId = targetId?.Trim(),
                Result = string.IsNullOrWhiteSpace(result) ? AuditActionTypes.Results.Success : result.Trim(),
                DetailsJson = sanitizedDetails,
                SourceService = string.IsNullOrWhiteSpace(sourceService) ? AuditActionTypes.Services.ReservationService : sourceService.Trim(),
                IpAddress = ipAddress?.Trim()
            };

            await _repository.InsertAsync(entry, cancellationToken);
            _logger.LogInformation("AuditLog recorded: {ActionType} on {TargetType}:{TargetId} by Admin {AdminId} ({AdminEmail}) Result={Result}",
                entry.ActionType, entry.TargetType, entry.TargetId, entry.AdminId, entry.AdminEmail, entry.Result);
        }
        catch (Exception ex)
        {
            // Fail-safe: A failure in logging must not crash the administrative flow, but must be logged prominently.
            _logger.LogError(ex, "CRITICAL: Failed to write AdminAuditLog for ActionType={ActionType}, TargetType={TargetType}, AdminId={AdminId}",
                actionType, targetType, adminId);
        }
    }
}

