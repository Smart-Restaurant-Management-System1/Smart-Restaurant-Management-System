namespace ReservationService.DTOs;

public sealed class AdminReservationResponseDto
{
    public IReadOnlyList<AdminReservationItemDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
}

public sealed class AdminReservationItemDto
{
    public int ReservationId { get; init; }
    public int CustomerId { get; init; }
    public string BookingReference { get; init; } = string.Empty;
    public int TableId { get; init; }
    public string TableNumber { get; init; } = string.Empty;
    public DateTime StartDateTime { get; init; }
    public DateTime EndDateTime { get; init; }
    public int GuestCount { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
