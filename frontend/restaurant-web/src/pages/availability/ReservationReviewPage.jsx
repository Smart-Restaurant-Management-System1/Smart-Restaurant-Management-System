import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createReservation } from '../../services/tableService';
import { bookingConflictMessage, isBookingConflict } from './bookingConflict';

const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ReservationReviewPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const key = useRef(newIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const selection = state?.table && state?.search;

  if (!selection) return <main className="availability-page"><div className="availability-content"><h1>Reservation details unavailable</h1><div className="availability-state"><p>Please search for an available table before creating a reservation.</p><Link to="/availability">Search availability</Link></div></div></main>;
  const { table, search } = state;
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true); setError(''); setFieldErrors({});
    try {
      const confirmation = await createReservation({ tableId: table.tableId, date: search.date, startTime: search.startTime, durationMinutes: search.durationMinutes, guestCount: search.guestCount }, key.current);
      navigate('/reservations/confirmation', { replace: true, state: { reservation: confirmation } });
    } catch (requestError) {
      if (requestError.response?.status === 400) { setFieldErrors(Object.fromEntries(Object.entries(requestError.response.data?.errors || {}).map(([name, messages]) => [name, messages?.[0]]))); }
      else if (requestError.response?.status === 401) setError('Your session has expired. Please sign in again before confirming your reservation.');
      else if (requestError.response?.status === 403) setError('This account is not allowed to create customer reservations.');
      else if (requestError.response?.status === 404) setError('The selected table no longer exists. Please search again.');
      else if (isBookingConflict(requestError)) setError(bookingConflictMessage);
      else setError('We could not confirm whether your reservation was created. Do not retry with a new booking until you have checked with the restaurant.');
    } finally { setSubmitting(false); }
  };

  return <main className="availability-page"><div className="availability-content"><Link className="link-jelly-back" to="/availability" state={{ search }}>← Edit search</Link>
    <header className="availability-header"><p className="active-tables-eyebrow">Review reservation</p><h1>Confirm your booking</h1><p>Availability is checked once more when you confirm.</p></header>
    <section className="reservation-review" aria-label="Reservation review"><dl><dt>Table</dt><dd>Table {table.tableNumber} · {table.seatingCapacity} seats</dd><dt>Date</dt><dd>{search.date}</dd><dt>Time</dt><dd>{search.startTime}–{search.endTime}</dd><dt>Duration</dt><dd>{search.durationMinutes} minutes</dd><dt>Guests</dt><dd>{search.guestCount}</dd></dl>
      {Object.keys(fieldErrors).length > 0 && <div className="active-tables-error" role="alert">{Object.entries(fieldErrors).map(([name, message]) => <p key={name}>{message}</p>)}</div>}
      {error && <div className="active-tables-error" role="alert"><p>{error}</p>{error.includes('search again') && <Link to="/availability" state={{ search }}>Return to availability search</Link>}{error.includes('sign in') && <Link to="/login">Sign in</Link>}</div>}
      <button type="button" className="btn-jelly-primary" onClick={submit} disabled={submitting} aria-describedby="reservation-submit-status">{submitting ? 'Confirming reservation…' : 'Confirm reservation'}</button>
      <p id="reservation-submit-status" role="status">{submitting ? 'Your reservation is being confirmed. Please do not submit again.' : ''}</p>
    </section>
  </div></main>;
}
