using ReservationService.DTOs;

namespace ReservationService.Services;

public interface IFeedbackService
{
    Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> SubmitFeedbackAsync(
        int customerId,
        SubmitFeedbackRequest request,
        CancellationToken cancellationToken = default);

    Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> UpdateFeedbackAsync(
        int customerId,
        int feedbackId,
        UpdateFeedbackRequest request,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? ErrorMessage, int StatusCode)> DeleteMyFeedbackAsync(
        int customerId,
        int feedbackId,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? ErrorMessage, int StatusCode)> AdminDeleteFeedbackAsync(
        int feedbackId,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? ErrorMessage, int StatusCode)> AdminMarkAsReadAsync(
        int feedbackId,
        bool isRead,
        CancellationToken cancellationToken = default);

    Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> AdminReplyAsync(
        int adminUserId,
        int feedbackId,
        AdminReplyRequest request,
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

