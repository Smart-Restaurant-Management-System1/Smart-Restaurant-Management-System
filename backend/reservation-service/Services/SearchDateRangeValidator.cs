namespace ReservationService.Services;

/// <summary>
/// Validates date ranges and query parameters for search and export operations (SR-249).
/// Enforces range order and maximum date span constraints to prevent denial-of-service database exhaustion.
/// </summary>
public static class SearchDateRangeValidator
{
    public const int MaxRangeDays = 90;

    public static (bool IsValid, string? ErrorMessage) ValidateRange(DateOnly? from, DateOnly? to, int maxDays = MaxRangeDays)
    {
        if (from.HasValue && to.HasValue)
        {
            if (from.Value > to.Value)
            {
                return (false, "From date must not be later than To date.");
            }

            if ((to.Value.DayNumber - from.Value.DayNumber) > maxDays)
            {
                return (false, $"Date range cannot exceed {maxDays} days.");
            }
        }

        return (true, null);
    }
}
