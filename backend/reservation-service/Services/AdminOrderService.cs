using System.Globalization;
using ReservationService.DTOs;
using ReservationService.Repositories;

namespace ReservationService.Services;

/// <summary>
/// Implements administrative order querying and CSV export with formula injection mitigation (SR-247, SR-248).
/// </summary>
public sealed class AdminOrderService : IAdminOrderService
{
    private readonly IAdminOrderRepository _repository;

    public AdminOrderService(IAdminOrderRepository repository)
    {
        _repository = repository;
    }

    public Task<AdminOrderResponseDto> SearchOrdersAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default)
    {
        return _repository.SearchOrdersAsync(query, cancellationToken);
    }

    public async Task<byte[]> ExportOrdersToCsvAsync(AdminOrderQueryDto query, CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetOrdersForExportAsync(query, cancellationToken);
        return SpreadsheetExportHelper.BuildOrdersCsvWithMetadata(items, query);
    }

    public async Task<byte[]> ExportOrdersToXlsxAsync(AdminOrderQueryDto query, string? adminEmail = null, CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetOrdersForExportAsync(query, cancellationToken);
        return SpreadsheetExportHelper.BuildOrdersXlsx(items, query, adminEmail);
    }
}


