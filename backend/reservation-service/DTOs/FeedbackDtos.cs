namespace ReservationService.DTOs;

public sealed record SubmitFeedbackRequest
{
    public int? ReservationId { get; init; }
    public int? OrderId { get; init; }
    public string? OrderType { get; init; }
    public int Rating { get; init; }
    public string? Comment { get; init; }
}

public sealed record FeedbackResponse
{
    public int FeedbackId { get; init; }
    public int CustomerId { get; init; }
    public string CustomerDisplayName { get; init; } = string.Empty;
    public int? ReservationId { get; init; }
    public string? BookingReference { get; init; }
    public int? OrderId { get; init; }
    public string? OrderReference { get; init; }
    public string? OrderType { get; init; }
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record AdminFeedbackQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 10;
    public int? Rating { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public string? Search { get; init; }
}

public sealed record FeedbackPagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public sealed record FeedbackSummaryResponse
{
    public double AverageRating { get; init; }
    public int TotalFeedbacks { get; init; }
    public Dictionary<int, int> RatingDistribution { get; init; } = new();
}
