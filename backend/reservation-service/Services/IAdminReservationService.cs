using ReservationService.Models;
namespace ReservationService.Services;
public interface IAdminReservationService { Task<ReservationHistoryPage> SearchAsync(AdminReservationQuery query, CancellationToken cancellationToken = default); Task<Reservation?> GetAsync(int reservationId, CancellationToken cancellationToken = default); }
