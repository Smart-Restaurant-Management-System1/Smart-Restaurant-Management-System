using ReservationService.Models;

namespace ReservationService.Services;

public interface IReservationCreationService
{
    Task<ReservationCreateResult> CreateAsync(ReservationCreationCommand command, CancellationToken cancellationToken = default);
}
