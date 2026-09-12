using ReservationService.Models;

namespace ReservationService.Services;

public interface IReservationLifecycleService
{
    Task<ReservationStatusUpdateOutcome> ChangeStatusAsync(int reservationId, int? customerId, string targetStatus, CancellationToken cancellationToken = default);
}
