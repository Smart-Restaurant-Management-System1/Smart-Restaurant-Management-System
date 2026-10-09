using ReservationService.DTOs;

namespace ReservationService.Services;

/// <summary>
/// Service interface for administrative order querying and CSV export (SR-247, SR-248).
/// </summary>
public interface IAdminOrderService
{
    Task<AdminOrderResponseDto> SearchOrdersAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default);
    Task<byte[]> ExportOrdersToCsvAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default);
}

