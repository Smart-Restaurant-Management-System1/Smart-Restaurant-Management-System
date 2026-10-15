export const formatReservationDateTime = (value) => String(value ?? '').replace('T', ' ').slice(0, 16);

export const isUpcomingReservation = (reservation, now = new Date()) =>
  new Date(reservation.startDateTime) >= now && !['Cancelled', 'Completed'].includes(reservation.status);

export const canCancelReservation = (reservation, now = new Date()) =>
  isUpcomingReservation(reservation, now) && ['Pending', 'Confirmed'].includes(reservation.status);

export const statusClassName = (status) => `reservation-status reservation-status-${String(status ?? '').toLowerCase()}`;
