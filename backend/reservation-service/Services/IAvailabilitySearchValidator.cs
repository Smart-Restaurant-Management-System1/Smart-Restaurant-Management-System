using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Services;

public interface IAvailabilitySearchValidator
{
    bool TryValidate(AvailabilitySearchRequestDto? request, out AvailabilitySearchCriteria? criteria, out Dictionary<string, string[]> errors);
}
