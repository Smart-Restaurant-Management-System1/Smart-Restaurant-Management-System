namespace ReservationService.DTOs;

public sealed class AdminReservationQueryDto
{
    public DateOnly? VisitFrom { get; init; }
    public DateOnly? VisitTo { get; init; }
    public string? Status { get; init; }
    public string? TableNumber { get; init; }
    public string? BookingReference { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
