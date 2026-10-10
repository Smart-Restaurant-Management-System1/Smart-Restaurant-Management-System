namespace ReservationService.Models;

/// <summary>
/// Domain model for administrative audit trail records (SR-223 / SR-250).
/// Records are append-only and immutable.
/// </summary>
public sealed class AdminAuditLog
{
    public long AuditLogId { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public string ActionType { get; set; } = string.Empty;
    public int AdminId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminRole { get; set; } = "Admin";
    public string TargetType { get; set; } = string.Empty;
    public string? TargetId { get; set; }
    public string Result { get; set; } = "Success";
    public string? DetailsJson { get; set; }
    public string SourceService { get; set; } = "ReservationService";
    public string? IpAddress { get; set; }
}

