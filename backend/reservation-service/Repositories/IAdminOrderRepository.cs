using ReservationService.DTOs;

namespace ReservationService.Repositories;

/// <summary>
/// Repository interface for administrative order search, filtering, and export (SR-247, SR-248).
/// </summary>
public interface IAdminOrderRepository
{
    Task<AdminOrderResponseDto> SearchOrdersAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AdminOrderItemDto>> GetOrdersForExportAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default);
}

