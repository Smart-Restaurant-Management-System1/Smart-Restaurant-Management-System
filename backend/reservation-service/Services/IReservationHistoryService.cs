using ReservationService.Models;

namespace ReservationService.Services;

public interface IReservationHistoryService
{
    Task<ReservationHistoryPage> GetForCustomerAsync(int customerId, int page, int pageSize, CancellationToken cancellationToken = default);
}
