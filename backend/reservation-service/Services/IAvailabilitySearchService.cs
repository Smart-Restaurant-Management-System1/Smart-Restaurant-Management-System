using ReservationService.Models;

namespace ReservationService.Services;

public interface IAvailabilitySearchService
{
    Task<IReadOnlyList<AvailableTable>> SearchAsync(AvailabilitySearchCriteria criteria, CancellationToken cancellationToken = default);
}
