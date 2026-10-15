using System.Text.RegularExpressions;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed partial class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly ILogger<FeedbackService> _logger;

    private static readonly Regex HtmlTagRegex = new("<.*?>", RegexOptions.Compiled);

    public FeedbackService(IFeedbackRepository feedbackRepository, ILogger<FeedbackService> logger)
    {
        _feedbackRepository = feedbackRepository;
        _logger = logger;
    }

    public async Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> SubmitFeedbackAsync(
        int customerId,
        SubmitFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        if (customerId <= 0)
        {
            return (null, "A valid customer identity is required.", StatusCodes.Status401Unauthorized);
        }

        if (request is null)
        {
            return (null, "Feedback request body is required.", StatusCodes.Status400BadRequest);
        }

        // Validate rating range
        if (request.Rating < 1 || request.Rating > 5)
        {
            return (null, "Rating must be an integer between 1 and 5.", StatusCodes.Status400BadRequest);
        }

        // Sanitize comment
        var sanitizedComment = SanitizeText(request.Comment);

        // Comment required for low ratings (1-3 stars)
        if (request.Rating <= 3 && string.IsNullOrWhiteSpace(sanitizedComment))
        {
            return (null, "A comment is required for ratings of 3 stars or lower to help us improve.", StatusCodes.Status400BadRequest);
        }

        // Length validation
        if (sanitizedComment != null)
        {
            if (sanitizedComment.Length > 1000)
            {
                return (null, "Comment cannot exceed 1000 characters.", StatusCodes.Status400BadRequest);
            }

            if (request.Rating <= 3 && sanitizedComment.Length < 5)
            {
                return (null, "Comment must be at least 5 characters long.", StatusCodes.Status400BadRequest);
            }
        }

        // Reservation reference validation & duplicate prevention
        if (request.ReservationId.HasValue && request.ReservationId.Value > 0)
        {
            var isReservationOwner = await _feedbackRepository.ValidateReservationOwnershipAsync(
                request.ReservationId.Value,
                customerId,
                cancellationToken);

            if (!isReservationOwner)
            {
                return (null, "Reservation not found or does not belong to you.", StatusCodes.Status404NotFound);
            }

            var alreadyHasFeedback = await _feedbackRepository.HasFeedbackForReservationAsync(
                customerId,
                request.ReservationId.Value,
                cancellationToken);

            if (alreadyHasFeedback)
            {
                return (null, "Feedback has already been submitted for this reservation.", StatusCodes.Status409Conflict);
            }
        }

        // Order reference validation & duplicate prevention
        if (request.OrderId.HasValue && request.OrderId.Value > 0)
        {
            var isOrderOwner = await _feedbackRepository.ValidateOrderOwnershipAsync(
                request.OrderId.Value,
                request.OrderType,
                customerId,
                cancellationToken);

            if (!isOrderOwner)
            {
                return (null, "Order not found or does not belong to you.", StatusCodes.Status404NotFound);
            }

            var alreadyHasOrderFeedback = await _feedbackRepository.HasFeedbackForOrderAsync(
                customerId,
                request.OrderId.Value,
                request.OrderType,
                cancellationToken);

            if (alreadyHasOrderFeedback)
            {
                return (null, "Feedback has already been submitted for this order.", StatusCodes.Status409Conflict);
            }
        }

        var domainModel = new CustomerFeedback
        {
            CustomerId = customerId,
            ReservationId = request.ReservationId > 0 ? request.ReservationId : null,
            OrderId = request.OrderId > 0 ? request.OrderId : null,
            OrderType = request.OrderId > 0 ? request.OrderType : null,
            Rating = request.Rating,
            Comment = sanitizedComment
        };

        var feedbackId = await _feedbackRepository.CreateAsync(domainModel, cancellationToken);

        _logger.LogInformation(
            "Customer {CustomerId} submitted feedback {FeedbackId} with rating {Rating}.",
            customerId,
            feedbackId,
            request.Rating);

        var response = new FeedbackResponse
        {
            FeedbackId = feedbackId,
            CustomerId = customerId,
            CustomerDisplayName = $"Customer #{customerId}",
            ReservationId = domainModel.ReservationId,
            OrderId = domainModel.OrderId,
            OrderType = domainModel.OrderType,
            Rating = domainModel.Rating,
            Comment = domainModel.Comment,
            IsRead = false,
            AdminReply = null,
            AdminRepliedAt = null,
            CreatedAt = DateTime.UtcNow
        };

        return (response, null, StatusCodes.Status201Created);
    }

    public async Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> UpdateFeedbackAsync(
        int customerId,
        int feedbackId,
        UpdateFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        if (customerId <= 0)
        {
            return (null, "A valid customer identity is required.", StatusCodes.Status401Unauthorized);
        }

        if (request is null)
        {
            return (null, "Update feedback request body is required.", StatusCodes.Status400BadRequest);
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            return (null, "Rating must be an integer between 1 and 5.", StatusCodes.Status400BadRequest);
        }

        var sanitizedComment = SanitizeText(request.Comment);

        if (request.Rating <= 3 && string.IsNullOrWhiteSpace(sanitizedComment))
        {
            return (null, "A comment is required for ratings of 3 stars or lower to help us improve.", StatusCodes.Status400BadRequest);
        }

        if (sanitizedComment != null)
        {
            if (sanitizedComment.Length > 1000)
            {
                return (null, "Comment cannot exceed 1000 characters.", StatusCodes.Status400BadRequest);
            }

            if (request.Rating <= 3 && sanitizedComment.Length < 5)
            {
                return (null, "Comment must be at least 5 characters long.", StatusCodes.Status400BadRequest);
            }
        }

        var existing = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (existing is null)
        {
            return (null, "Feedback not found.", StatusCodes.Status404NotFound);
        }

        if (existing.CustomerId != customerId)
        {
            return (null, "You are not authorized to modify feedback submitted by another customer.", StatusCodes.Status403Forbidden);
        }

        var success = await _feedbackRepository.UpdateAsync(feedbackId, customerId, request.Rating, sanitizedComment, cancellationToken);
        if (!success)
        {
            return (null, "Failed to update feedback.", StatusCodes.Status500InternalServerError);
        }

        _logger.LogInformation("Customer {CustomerId} updated feedback {FeedbackId} to rating {Rating}.", customerId, feedbackId, request.Rating);

        var updated = new FeedbackResponse
        {
            FeedbackId = feedbackId,
            CustomerId = customerId,
            CustomerDisplayName = $"Customer #{customerId}",
            ReservationId = existing.ReservationId,
            OrderId = existing.OrderId,
            OrderType = existing.OrderType,
            Rating = request.Rating,
            Comment = sanitizedComment,
            IsRead = existing.IsRead,
            AdminReply = existing.AdminReply,
            AdminRepliedAt = existing.AdminRepliedAt,
            CreatedAt = existing.CreatedAt
        };

        return (updated, null, StatusCodes.Status200OK);
    }

    public async Task<(bool Success, string? ErrorMessage, int StatusCode)> DeleteMyFeedbackAsync(
        int customerId,
        int feedbackId,
        CancellationToken cancellationToken = default)
    {
        if (customerId <= 0)
        {
            return (false, "A valid customer identity is required.", StatusCodes.Status401Unauthorized);
        }

        var existing = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (existing is null)
        {
            return (false, "Feedback not found.", StatusCodes.Status404NotFound);
        }

        if (existing.CustomerId != customerId)
        {
            return (false, "You are not authorized to delete feedback submitted by another customer.", StatusCodes.Status403Forbidden);
        }

        var deleted = await _feedbackRepository.DeleteForCustomerAsync(feedbackId, customerId, cancellationToken);
        if (!deleted)
        {
            return (false, "Failed to delete feedback.", StatusCodes.Status500InternalServerError);
        }

        _logger.LogInformation("Customer {CustomerId} deleted feedback {FeedbackId}.", customerId, feedbackId);
        return (true, null, StatusCodes.Status204NoContent);
    }

    public async Task<(bool Success, string? ErrorMessage, int StatusCode)> AdminDeleteFeedbackAsync(
        int feedbackId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (existing is null)
        {
            return (false, "Feedback not found.", StatusCodes.Status404NotFound);
        }

        var deleted = await _feedbackRepository.DeleteForAdminAsync(feedbackId, cancellationToken);
        if (!deleted)
        {
            return (false, "Failed to delete feedback.", StatusCodes.Status500InternalServerError);
        }

        _logger.LogInformation("Admin deleted feedback {FeedbackId}.", feedbackId);
        return (true, null, StatusCodes.Status204NoContent);
    }

    public async Task<(bool Success, string? ErrorMessage, int StatusCode)> AdminMarkAsReadAsync(
        int feedbackId,
        bool isRead,
        CancellationToken cancellationToken = default)
    {
        var existing = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (existing is null)
        {
            return (false, "Feedback not found.", StatusCodes.Status404NotFound);
        }

        var success = await _feedbackRepository.MarkAsReadAsync(feedbackId, isRead, cancellationToken);
        return (success, success ? null : "Failed to update read status.", success ? StatusCodes.Status200OK : StatusCodes.Status500InternalServerError);
    }

    public async Task<(FeedbackResponse? Response, string? ErrorMessage, int StatusCode)> AdminReplyAsync(
        int adminUserId,
        int feedbackId,
        AdminReplyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Reply))
        {
            return (null, "Management reply text is required.", StatusCodes.Status400BadRequest);
        }

        var sanitizedReply = SanitizeText(request.Reply);
        if (string.IsNullOrWhiteSpace(sanitizedReply))
        {
            return (null, "Management reply cannot be blank.", StatusCodes.Status400BadRequest);
        }

        if (sanitizedReply.Length > 1000)
        {
            return (null, "Management reply cannot exceed 1000 characters.", StatusCodes.Status400BadRequest);
        }

        var existing = await _feedbackRepository.GetByIdAsync(feedbackId, cancellationToken);
        if (existing is null)
        {
            return (null, "Feedback not found.", StatusCodes.Status404NotFound);
        }

        var success = await _feedbackRepository.SetAdminReplyAsync(feedbackId, sanitizedReply, adminUserId, cancellationToken);
        if (!success)
        {
            return (null, "Failed to save management reply.", StatusCodes.Status500InternalServerError);
        }

        _logger.LogInformation("Admin {AdminId} replied to feedback {FeedbackId}.", adminUserId, feedbackId);

        var updated = new FeedbackResponse
        {
            FeedbackId = feedbackId,
            CustomerId = existing.CustomerId,
            CustomerDisplayName = $"Customer #{existing.CustomerId}",
            ReservationId = existing.ReservationId,
            OrderId = existing.OrderId,
            OrderType = existing.OrderType,
            Rating = existing.Rating,
            Comment = existing.Comment,
            IsRead = true,
            AdminReply = sanitizedReply,
            AdminRepliedAt = DateTime.UtcNow,
            CreatedAt = existing.CreatedAt
        };

        return (updated, null, StatusCodes.Status200OK);
    }

    public async Task<IReadOnlyList<FeedbackResponse>> GetMyFeedbackAsync(
        int customerId,
        CancellationToken cancellationToken = default)
    {
        if (customerId <= 0)
        {
            return Array.Empty<FeedbackResponse>();
        }

        return await _feedbackRepository.GetForCustomerAsync(customerId, cancellationToken);
    }

    public async Task<FeedbackPagedResult<FeedbackResponse>> GetAdminFeedbackAsync(
        AdminFeedbackQuery query,
        CancellationToken cancellationToken = default)
    {
        return await _feedbackRepository.GetForAdminAsync(query, cancellationToken);
    }

    public async Task<FeedbackSummaryResponse> GetAdminSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        return await _feedbackRepository.GetSummaryAsync(cancellationToken);
    }

    private static string? SanitizeText(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var sanitized = HtmlTagRegex.Replace(input, string.Empty).Trim();
        return string.IsNullOrEmpty(sanitized) ? null : sanitized;
    }
}

