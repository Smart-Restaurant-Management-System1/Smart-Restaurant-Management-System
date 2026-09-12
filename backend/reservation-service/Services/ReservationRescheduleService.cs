using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class ReservationRescheduleService(IReservationRepository repository) : IReservationRescheduleService
{
    public Task<ReservationRescheduleResult> RescheduleAsync(ReservationRescheduleCommand command, CancellationToken cancellationToken = default) =>
        repository.RescheduleAtomicallyAsync(command, cancellationToken);
}
