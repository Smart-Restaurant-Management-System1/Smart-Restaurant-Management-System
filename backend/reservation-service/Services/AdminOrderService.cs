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

        var headers = new[]
        {
            "Order Reference",
            "Order Type",
            "Customer ID",
            "Customer Name",
            "Customer Email",
            "Customer Phone",
            "Table",
            "Status",
            "Total Amount (LKR)",
            "Payment Status",
            "Payment Method",
            "Created At"
        };

        var rows = items.Select(item => new[]
        {
            item.OrderReference,
            item.OrderType,
            item.CustomerId.ToString(CultureInfo.InvariantCulture),
            item.CustomerName,
            item.CustomerEmail,
            item.CustomerPhone,
            item.TableNumber,
            item.Status,
            item.TotalAmount.ToString("F2", CultureInfo.InvariantCulture),
            item.PaymentStatus,
            item.PaymentMethod ?? "N/A",
            item.CreatedAt.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)
        });

        return CsvExportHelper.BuildCsv(headers, rows);
    }
}

