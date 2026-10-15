using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class ReservationCreationService(IReservationRepository repository) : IReservationCreationService
{
    public Task<ReservationCreateResult> CreateAsync(ReservationCreationCommand command, CancellationToken cancellationToken = default) =>
        repository.CreateAtomicallyAsync(command, cancellationToken);
}
