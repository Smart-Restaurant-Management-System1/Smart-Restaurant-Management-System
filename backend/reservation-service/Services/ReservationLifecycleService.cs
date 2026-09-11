using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class ReservationLifecycleService(IReservationRepository repository) : IReservationLifecycleService
{
    public async Task<ReservationStatusUpdateOutcome> ChangeStatusAsync(int reservationId, int? customerId, string targetStatus, CancellationToken cancellationToken = default)
    {
        if (!ReservationStatus.IsKnown(targetStatus)) return ReservationStatusUpdateOutcome.Conflict;
        var current = await repository.GetStatusAsync(reservationId, customerId, cancellationToken);
        if (current is null) return ReservationStatusUpdateOutcome.NotFound;
        if (!ReservationStatusTransitionPolicy.IsAllowed(current, targetStatus)) return ReservationStatusUpdateOutcome.Conflict;
        return await repository.UpdateStatusAsync(reservationId, customerId, current, targetStatus, cancellationToken)
            ? ReservationStatusUpdateOutcome.Updated
            : ReservationStatusUpdateOutcome.Conflict;
    }
}
