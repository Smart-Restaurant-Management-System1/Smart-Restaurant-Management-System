namespace ReservationService.DTOs;

/// <summary>
/// Public DTO representing an administrative audit log entry (SR-223 / SR-250 / SR-253).
/// Read-only; guarantees zero leakage of credentials or sensitive personal information.
/// </summary>
public sealed class AdminAuditLogResponseDto
{
    public long AuditLogId { get; set; }
    public DateTime TimestampUtc { get; set; }
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

/// <summary>
/// Query filters for reviewing audit log records with date, action, and admin constraints.
/// </summary>
public sealed class AdminAuditLogQueryDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? ActionType { get; set; }
    public int? AdminId { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Paginated result wrapper for administrative audit log queries.
/// </summary>
public sealed class PagedAuditLogsResultDto
{
    public IReadOnlyList<AdminAuditLogResponseDto> Items { get; set; } = Array.Empty<AdminAuditLogResponseDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

