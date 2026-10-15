using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class ReservationHistoryService(IReservationRepository repository) : IReservationHistoryService
{
    public Task<ReservationHistoryPage> GetForCustomerAsync(int customerId, int page, int pageSize, CancellationToken cancellationToken = default) =>
        repository.GetHistoryForCustomerAsync(customerId, page, pageSize, cancellationToken);
}
