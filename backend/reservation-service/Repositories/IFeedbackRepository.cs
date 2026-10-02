using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IFeedbackRepository
{
    Task<int> CreateAsync(CustomerFeedback feedback, CancellationToken cancellationToken = default);
    Task<CustomerFeedback?> GetByIdAsync(int feedbackId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FeedbackResponse>> GetForCustomerAsync(int customerId, CancellationToken cancellationToken = default);
    Task<FeedbackPagedResult<FeedbackResponse>> GetForAdminAsync(AdminFeedbackQuery query, CancellationToken cancellationToken = default);
    Task<FeedbackSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default);
    Task<bool> HasFeedbackForReservationAsync(int customerId, int reservationId, CancellationToken cancellationToken = default);
    Task<bool> HasFeedbackForOrderAsync(int customerId, int orderId, string? orderType, CancellationToken cancellationToken = default);
    Task<bool> ValidateReservationOwnershipAsync(int reservationId, int customerId, CancellationToken cancellationToken = default);
    Task<bool> ValidateOrderOwnershipAsync(int orderId, string? orderType, int customerId, CancellationToken cancellationToken = default);
}
