using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IReservationRepository
{
    Task<ReservationCreateResult> CreateAtomicallyAsync(ReservationCreationCommand command, CancellationToken cancellationToken = default);
}
