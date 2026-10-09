using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class SearchDateRangeValidatorTests
{
    [Fact]
    public void ValidateRange_BothDatesNull_ReturnsValid()
    {
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(null, null);

        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void ValidateRange_OnlyFromDateProvided_ReturnsValid()
    {
        var from = new DateOnly(2026, 10, 1);
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(from, null);

        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void ValidateRange_OnlyToDateProvided_ReturnsValid()
    {
        var to = new DateOnly(2026, 10, 10);
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(null, to);

        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void ValidateRange_ValidRangeWithinLimit_ReturnsValid()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 30);
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(from, to);

        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void ValidateRange_FromAfterTo_ReturnsInvalid()
    {
        var from = new DateOnly(2026, 10, 20);
        var to = new DateOnly(2026, 10, 10);
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(from, to);

        Assert.False(isValid);
        Assert.Equal("From date must not be later than To date.", errorMessage);
    }

    [Fact]
    public void ValidateRange_RangeExceeds90Days_ReturnsInvalid()
    {
        var from = new DateOnly(2026, 1, 1);
        var to = new DateOnly(2026, 5, 1); // 120 days
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(from, to, 90);

        Assert.False(isValid);
        Assert.Equal("Date range cannot exceed 90 days.", errorMessage);
    }

    [Fact]
    public void ValidateRange_RangeExactly90Days_ReturnsValid()
    {
        var from = new DateOnly(2026, 1, 1);
        var to = from.AddDays(90);
        var (isValid, errorMessage) = SearchDateRangeValidator.ValidateRange(from, to, 90);

        Assert.True(isValid);
        Assert.Null(errorMessage);
    }
}
