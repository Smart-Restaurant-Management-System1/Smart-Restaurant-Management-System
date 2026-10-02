using ReservationService.DTOs;

namespace ReservationService.Services;

public interface IFeedbackService
{
    Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> SubmitFeedbackAsync(
        int customerId,
        SubmitFeedbackRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FeedbackResponse>> GetMyFeedbackAsync(
        int customerId,
        CancellationToken cancellationToken = default);

    Task<FeedbackPagedResult<FeedbackResponse>> GetAdminFeedbackAsync(
        AdminFeedbackQuery query,
        CancellationToken cancellationToken = default);

    Task<FeedbackSummaryResponse> GetAdminSummaryAsync(
        CancellationToken cancellationToken = default);
}
