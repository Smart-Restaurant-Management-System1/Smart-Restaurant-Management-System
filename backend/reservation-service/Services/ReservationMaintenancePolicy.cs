using Microsoft.Extensions.Options;
using ReservationService.Models;

namespace ReservationService.Services;

/// <summary>Booking times are restaurant-local DATETIME values; audit times remain UTC.</summary>
public sealed class ReservationMaintenancePolicy(TimeProvider clock, IOptions<AvailabilityRulesOptions> options)
{
    public DateTime UtcNow => clock.GetUtcNow().UtcDateTime;
    public DateTime RestaurantNow => TimeZoneInfo.ConvertTime(clock.GetUtcNow(),
        TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId)).DateTime;
    public bool CanCustomerMaintain(Reservation reservation) =>
        reservation.Status is ReservationStatus.Pending or ReservationStatus.Confirmed &&
        reservation.StartDateTime > RestaurantNow;
    public bool CanReschedule(Reservation reservation, bool isAdmin) =>
        isAdmin ? reservation.Status is ReservationStatus.Pending or ReservationStatus.Confirmed
                : CanCustomerMaintain(reservation);
}
