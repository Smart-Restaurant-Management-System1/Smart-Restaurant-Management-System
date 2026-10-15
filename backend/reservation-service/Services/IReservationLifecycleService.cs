using ReservationService.Models;

namespace ReservationService.Services;

public interface IReservationLifecycleService
{
    Task<ReservationCancellationResult> CancelForCustomerAsync(int reservationId, int customerId, CancellationToken cancellationToken = default);
    Task<ReservationStatusUpdateOutcome> ChangeStatusAsync(int reservationId, int? customerId, string targetStatus, CancellationToken cancellationToken = default);
}
