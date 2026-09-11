import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function formatRestaurantDateTime(value) {
  return String(value ?? '').replace('T', ' ').slice(0, 16);
}

export default function ReservationConfirmationPage() {
  const reservation = useLocation().state?.reservation;

  if (!reservation) {
    return <main className="availability-page"><div className="availability-content"><h1>No confirmed reservation found</h1><div className="availability-state"><p>For your security, a confirmation is shown only immediately after the server confirms a reservation.</p><Link to="/availability">Search for a table</Link></div></div></main>;
  }

  return <main className="availability-page"><div className="availability-content"><section className="reservation-confirmation" aria-labelledby="confirmation-heading" tabIndex="-1"><p className="active-tables-eyebrow">Reservation confirmed</p><h1 id="confirmation-heading">Your table is requested</h1><p>Your booking reference is <strong>{reservation.bookingReference}</strong>.</p><dl><dt>Reservation</dt><dd>#{reservation.reservationId}</dd><dt>Table</dt><dd>Table {reservation.tableNumber}</dd><dt>Visit</dt><dd>{formatRestaurantDateTime(reservation.startDateTime)} - {formatRestaurantDateTime(reservation.endDateTime)}</dd><dt>Guests</dt><dd>{reservation.guestCount}</dd><dt>Status</dt><dd>{reservation.status}</dd></dl><Link className="btn-jelly-primary" to="/portal">Back to portal</Link></section></div></main>;
}
