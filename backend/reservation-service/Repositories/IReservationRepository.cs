using ReservationService.Models;

namespace ReservationService.Repositories;

public interface IReservationRepository
{
    Task<ReservationCreateResult> CreateAtomicallyAsync(ReservationCreationCommand command, CancellationToken cancellationToken = default);
    Task<ReservationHistoryPage> GetHistoryForCustomerAsync(int customerId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<string?> GetStatusAsync(int reservationId, int? customerId, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(int reservationId, int? customerId, string currentStatus, string targetStatus, CancellationToken cancellationToken = default);
}
