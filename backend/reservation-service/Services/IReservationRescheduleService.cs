using ReservationService.Models;

namespace ReservationService.Services;

public interface IReservationRescheduleService
{
    Task<ReservationRescheduleResult> RescheduleAsync(ReservationRescheduleCommand command, CancellationToken cancellationToken = default);
}
