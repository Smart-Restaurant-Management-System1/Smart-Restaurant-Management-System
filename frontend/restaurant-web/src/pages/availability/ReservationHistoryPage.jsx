import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReservationHistory } from '../../services/tableService';
import { formatReservationDateTime, isUpcomingReservation, statusClassName } from './reservationHistoryView';
import PageHeader from '../../components/common/PageHeader';

function ReservationCard({ reservation }) {
  return (
    <article className="reservation-history-card bistro-card">
      <div className="reservation-history-card-header">
        <div>
          <p className="reservation-reference" style={{ color: 'var(--bistro-bronze)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em' }}>{reservation.bookingReference}</p>
          <h2 style={{ fontSize: '1.35rem', margin: '0.2rem 0', color: 'var(--bistro-ink)' }}>
            Table {reservation.tableNumber}
          </h2>
        </div>
        <span className={statusClassName(reservation.status)}>{reservation.status}</span>
      </div>
      <dl>
        <dt style={{ color: 'var(--bistro-muted)' }}>Visit</dt>
        <dd style={{ color: 'var(--bistro-ink)' }}>{formatReservationDateTime(reservation.startDateTime)} - {formatReservationDateTime(reservation.endDateTime)}</dd>
        <dt style={{ color: 'var(--bistro-muted)' }}>Guests</dt>
        <dd style={{ color: 'var(--bistro-ink)' }}>{reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}</dd>
        <dt style={{ color: 'var(--bistro-muted)' }}>Booked</dt>
        <dd style={{ color: 'var(--bistro-ink)' }}>{formatReservationDateTime(reservation.createdAt)}</dd>
      </dl>
      <Link className="bistro-button-outline" to={'/reservations/' + reservation.reservationId} style={{ marginTop: '0.85rem', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
        View or Manage Reservation <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export default function ReservationHistoryPage() {
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = async (targetPage = page) => {
    setError('');
    setHistory(null);
    try {
      setHistory(await getMyReservationHistory(targetPage));
    } catch (requestError) {
      setError(
        requestError?.response?.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'We could not load your reservation history. Please try again.'
      );
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const items = history?.items ?? [];
  const upcoming = items.filter((item) => isUpcomingReservation(item));
  const past = items.filter((item) => !isUpcomingReservation(item));

  return (
    <div className="reservation-history-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="My Reservations"
        title={<>Your Booking <em>History</em></>}
        subtitle="Review upcoming dining reservations and previous visits. Manage or reschedule your bookings directly."
        actions={
          <Link to="/tables" className="bistro-button-gold">
            + Book New Table
          </Link>
        }
      />

      {error && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{error}</p>
          <button type="button" className="bistro-button-gold" onClick={() => load(page)}>
            Try again
          </button>
        </div>
      )}

      {!history && !error && (
        <div className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem' }}>
          Loading your reservations…
        </div>
      )}

      {history && items.length === 0 && (
        <div className="bistro-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <p style={{ fontSize: '1rem', color: 'var(--bistro-muted)', marginBottom: '1.5rem' }}>
            You do not have any reservations yet. Pull up a chair and make yourself at home.
          </p>
          <Link className="bistro-button-gold" to="/tables">
            Explore Tables & Book <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {history && items.length > 0 && (
        <>
          <section className="reservation-history-section" aria-labelledby="upcoming-heading" style={{ marginBottom: '2.5rem' }}>
            <h2 id="upcoming-heading" style={{ fontSize: '1.45rem', marginBottom: '1.25rem' }}>
              Upcoming <em>Visits</em>
            </h2>
            {upcoming.length ? (
              <div className="reservation-history-grid">
                {upcoming.map((item) => (
                  <ReservationCard key={item.reservationId} reservation={item} />
                ))}
              </div>
            ) : (
              <p className="reservation-history-empty" style={{ color: 'var(--bistro-muted)' }}>
                No upcoming reservations on this page.
              </p>
            )}
          </section>

          <section className="reservation-history-section" aria-labelledby="past-heading" style={{ marginBottom: '2.5rem' }}>
            <h2 id="past-heading" style={{ fontSize: '1.45rem', marginBottom: '1.25rem' }}>
              Previous and Cancelled <em>Visits</em>
            </h2>
            {past.length ? (
              <div className="reservation-history-grid">
                {past.map((item) => (
                  <ReservationCard key={item.reservationId} reservation={item} />
                ))}
              </div>
            ) : (
              <p className="reservation-history-empty" style={{ color: 'var(--bistro-muted)' }}>
                No previous or cancelled reservations on this page.
              </p>
            )}
          </section>

          {history.totalPages > 1 && (
            <nav className="reservation-pagination" aria-label="Reservation history pages">
              <button
                type="button"
                className="btn-jelly-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                Page {history.page} of {history.totalPages}
              </span>
              <button
                type="button"
                className="btn-jelly-secondary"
                disabled={page >= history.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
