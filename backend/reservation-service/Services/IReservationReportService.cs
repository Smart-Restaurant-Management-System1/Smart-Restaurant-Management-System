using ReservationService.DTOs;
namespace ReservationService.Services;
public interface IReservationReportService { Task<ReservationReportDto> GetAsync(DateOnly from, DateOnly to, CancellationToken token = default); byte[] ToCsv(ReservationReportDto report); byte[] ToXlsx(ReservationReportDto report); }
