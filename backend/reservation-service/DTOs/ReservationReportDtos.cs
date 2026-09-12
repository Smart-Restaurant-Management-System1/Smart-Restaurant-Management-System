namespace ReservationService.DTOs;

public sealed class ReservationReportQueryDto
{
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
}

public sealed record ReservationReportDto(
    DateOnly From,
    DateOnly To,
    ReservationReportSummaryDto Summary,
    IReadOnlyList<BookingsPerDayDto> BookingsPerDay,
    IReadOnlyList<TableReservationShareDto> TableReservationShare
);

public sealed record ReservationReportSummaryDto(
    int TotalReservations,
    int ConfirmedReservations,
    int PendingReservations,
    int CancelledReservations,
    int CompletedReservations,
    double CancellationRate,
    double AveragePartySize,
    int? MostRequestedTableId,
    string? MostRequestedTableNumber
);

public sealed record BookingsPerDayDto(
    DateOnly Date,
    int Total,
    int Pending,
    int Confirmed,
    int Cancelled,
    int Completed
);

public sealed record TableReservationShareDto(
    int TableId,
    string TableNumber,
    int Capacity,
    int ReservationCount,
    int NonCancelledReservationCount,
    double TableReservationShare
);
