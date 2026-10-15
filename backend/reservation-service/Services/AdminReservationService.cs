using ReservationService.Models;
using ReservationService.Repositories;
namespace ReservationService.Services;
public sealed class AdminReservationService(IReservationRepository repository) : IAdminReservationService
{
    public Task<ReservationHistoryPage> SearchAsync(AdminReservationQuery query, CancellationToken cancellationToken = default) => repository.GetForAdminAsync(query, cancellationToken);
    public Task<IReadOnlyList<Reservation>> GetForExportAsync(AdminReservationQuery query, CancellationToken cancellationToken = default) => repository.GetForAdminExportAsync(query, cancellationToken);
    public Task<Reservation?> GetAsync(int reservationId, CancellationToken cancellationToken = default) => repository.GetByIdAsync(reservationId, cancellationToken);
}
