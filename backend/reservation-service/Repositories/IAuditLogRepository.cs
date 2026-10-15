using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Repositories;

/// <summary>
/// Authoritative append-only repository for administrative audit logs (SR-223 / SR-250).
/// </summary>
public interface IAuditLogRepository
{
    Task<long> InsertAsync(AdminAuditLog log, CancellationToken cancellationToken = default);
    Task<PagedAuditLogsResultDto> GetPagedAuditLogsAsync(AdminAuditLogQueryDto query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetDistinctActionTypesAsync(CancellationToken cancellationToken = default);
}

