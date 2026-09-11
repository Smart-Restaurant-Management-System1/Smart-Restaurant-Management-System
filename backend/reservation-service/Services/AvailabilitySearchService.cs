using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class AvailabilitySearchService : IAvailabilitySearchService
{
    private readonly IAvailabilityRepository _repository;
    public AvailabilitySearchService(IAvailabilityRepository repository) => _repository = repository;

    public Task<IReadOnlyList<AvailableTable>> SearchAsync(AvailabilitySearchCriteria criteria, CancellationToken cancellationToken = default) =>
        _repository.GetAvailableTablesAsync(criteria, cancellationToken);
}
