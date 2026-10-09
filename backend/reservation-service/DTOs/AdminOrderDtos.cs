namespace ReservationService.DTOs;

/// <summary>
/// Query criteria for administrative order search and filtering (SR-247).
/// </summary>
public sealed class AdminOrderQueryDto
{
    public string? OrderReference { get; init; }
    public string? OrderType { get; init; } // "DineIn", "ReservationPreOrder"
    public string? Status { get; init; }
    public string? Customer { get; init; } // Customer name, email, or customer ID
    public string? TableNumber { get; init; }
    public DateOnly? DateFrom { get; init; }
    public DateOnly? DateTo { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

/// <summary>
/// Operational order item representation for administrative view and export (SR-247, SR-248).
/// </summary>
public sealed class AdminOrderItemDto
{
    public int OrderId { get; init; }
    public string OrderReference { get; init; } = string.Empty;
    public string OrderType { get; init; } = string.Empty;
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public int? ReservationId { get; init; }
    public int CustomerId { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string CustomerEmail { get; init; } = string.Empty;
    public string CustomerPhone { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public decimal TotalAmount { get; init; }
    public string PaymentStatus { get; init; } = "Unpaid";
    public string? PaymentMethod { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Paginated order list response for admin view (SR-247).
/// </summary>
public sealed class AdminOrderResponseDto
{
    public IReadOnlyList<AdminOrderItemDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
}

