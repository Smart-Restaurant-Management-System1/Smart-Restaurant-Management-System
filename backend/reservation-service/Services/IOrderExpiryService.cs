using ReservationService.Models;

namespace ReservationService.Services;

public interface IOrderExpiryService
{
    Task<OrderExpiryResult> ExpireUnpaidOrdersAsync(int thresholdMinutes, CancellationToken cancellationToken = default);
}
