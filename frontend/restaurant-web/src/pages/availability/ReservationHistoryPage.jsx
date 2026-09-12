import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelMyReservation, getMyReservationHistory } from '../../services/tableService';
import { canCancelReservation, formatReservationDateTime, isUpcomingReservation, statusClassName } from './reservationHistoryView';

function ReservationCard({ reservation, onCancelled, cancelling }) {
  const canCancel = canCancelReservation(reservation);
  return <article className="reservation-history-card">
    <div className="reservation-history-card-header"><div><p className="reservation-reference">{reservation.bookingReference}</p><h2>Table {reservation.tableNumber}</h2></div><span className={statusClassName(reservation.status)}>{reservation.status}</span></div>
    <dl><dt>Visit</dt><dd>{formatReservationDateTime(reservation.startDateTime)} - {formatReservationDateTime(reservation.endDateTime)}</dd><dt>Guests</dt><dd>{reservation.guestCount}</dd><dt>Booked</dt><dd>{formatReservationDateTime(reservation.createdAt)}</dd></dl>
    {canCancel && <Link className="btn-jelly-secondary" to="/reservations/reschedule" state={{ reservation }}>Reschedule</Link>}
    {canCancel && <button type="button" className="reservation-cancel" disabled={cancelling === reservation.reservationId} onClick={() => onCancelled(reservation.reservationId)}>{cancelling === reservation.reservationId ? 'Cancelling…' : 'Cancel reservation'}</button>}
  </article>;
}

export default function ReservationHistoryPage() {
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const load = async (targetPage = page) => {
    setError(''); setHistory(null);
    try { setHistory(await getMyReservationHistory(targetPage)); }
    catch (requestError) { setError(requestError?.response?.status === 401 ? 'Your session has expired. Please sign in again.' : 'We could not load your reservation history. Please try again.'); }
  };
  useEffect(() => { load(page); }, [page]);
  const cancel = async (reservationId) => {
    setCancelling(reservationId); setError('');
    try { await cancelMyReservation(reservationId); await load(page); }
    catch (requestError) { setError(requestError?.response?.data?.message || 'This reservation could not be cancelled. Please refresh and try again.'); }
    finally { setCancelling(null); }
  };
  const items = history?.items ?? [];
  const upcoming = items.filter((item) => isUpcomingReservation(item));
  const past = items.filter((item) => !isUpcomingReservation(item));
  return <main className="availability-page"><div className="availability-content">
    <Link className="link-jelly-back" to="/portal">← Back to portal</Link>
    <header className="availability-header"><p className="active-tables-eyebrow">My reservations</p><h1>Your booking history</h1><p>Review your upcoming and previous visits. Statuses are provided by the restaurant.</p></header>
    {error && <div className="availability-state active-tables-error" role="alert"><p>{error}</p><button type="button" className="btn-jelly-secondary" onClick={() => load(page)}>Try again</button></div>}
    {!history && !error && <div className="availability-state" role="status">Loading your reservations…</div>}
    {history && items.length === 0 && <div className="availability-state"><p>You do not have any reservations yet.</p><Link className="btn-jelly-primary" to="/availability">Find a table</Link></div>}
    {history && items.length > 0 && <><section className="reservation-history-section" aria-labelledby="upcoming-heading"><h2 id="upcoming-heading">Upcoming</h2>{upcoming.length ? <div className="reservation-history-grid">{upcoming.map((item) => <ReservationCard key={item.reservationId} reservation={item} onCancelled={cancel} cancelling={cancelling} />)}</div> : <p className="reservation-history-empty">No upcoming reservations on this page.</p>}</section>
      <section className="reservation-history-section" aria-labelledby="past-heading"><h2 id="past-heading">Previous and cancelled</h2>{past.length ? <div className="reservation-history-grid">{past.map((item) => <ReservationCard key={item.reservationId} reservation={item} onCancelled={cancel} cancelling={cancelling} />)}</div> : <p className="reservation-history-empty">No previous or cancelled reservations on this page.</p>}</section>
      {history.totalPages > 1 && <nav className="reservation-pagination" aria-label="Reservation history pages"><button type="button" className="btn-jelly-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {history.page} of {history.totalPages}</span><button type="button" className="btn-jelly-secondary" disabled={page >= history.totalPages} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </div></main>;
}
