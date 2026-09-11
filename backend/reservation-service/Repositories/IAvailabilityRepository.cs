using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IAvailabilityRepository
{
    Task<IReadOnlyList<AvailableTable>> GetAvailableTablesAsync(AvailabilitySearchCriteria criteria, CancellationToken cancellationToken = default);
}
