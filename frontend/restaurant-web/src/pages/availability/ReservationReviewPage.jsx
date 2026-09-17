import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createReservation } from '../../services/tableService';
import { bookingConflictMessage, isBookingConflict } from './bookingConflict';
import PageHeader from '../../components/common/PageHeader';

const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ReservationReviewPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const key = useRef(newIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const selection = state?.table && state?.search;

  if (!selection) {
    return (
      <div className="reservation-review-page-content" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Reservation Review"
          title="Reservation Details Unavailable"
          subtitle="Please search for an available dining table first before confirming a booking."
        />
        <div className="availability-state bistro-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: '#4b5563', marginBottom: '1.25rem' }}>No table selection was found in your active session.</p>
          <Link to="/availability" className="btn-jelly-primary" style={{ textDecoration: 'none' }}>Search Table Availability</Link>
        </div>
      </div>
    );
  }

  const { table, search } = state;
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const confirmation = await createReservation(
        {
          tableId: table.tableId,
          date: search.date,
          startTime: search.startTime,
          durationMinutes: search.durationMinutes,
          guestCount: search.guestCount,
        },
        key.current
      );
      navigate('/reservations/confirmation', { replace: true, state: { reservation: confirmation } });
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(Object.fromEntries(Object.entries(requestError.response.data?.errors || {}).map(([name, messages]) => [name, messages?.[0]])));
      } else if (requestError.response?.status === 401) {
        setError('Your session has expired. Please sign in again before confirming your reservation.');
      } else if (requestError.response?.status === 403) {
        setError('This account is not allowed to create customer reservations.');
      } else if (requestError.response?.status === 404) {
        setError('The selected table no longer exists. Please search again.');
      } else if (isBookingConflict(requestError)) {
        setError(bookingConflictMessage);
      } else {
        setError('We could not confirm whether your reservation was created. Do not retry with a new booking until you have checked with the restaurant.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reservation-review-page-content" style={{ maxWidth: '780px', margin: '0 auto' }}>
      <PageHeader
        eyebrow="Review Reservation"
        title={<>Confirm Your <em>Reservation</em></>}
        subtitle="Please review your reservation details below. Availability will be locked once confirmed."
        actions={
          <Link to="/availability" state={{ search }} className="bistro-button-outline">
            ← Edit Search
          </Link>
        }
      />

      <section className="reservation-review bistro-card" aria-label="Reservation review" style={{ padding: '2rem' }}>
        <dl>
          <dt style={{ color: 'var(--bistro-muted)' }}>Table</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}><strong>Table {table.tableNumber}</strong> · {table.seatingCapacity} seats</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Date</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{search.date}</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Time Window</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{search.startTime} – {search.endTime}</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Duration</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{search.durationMinutes} minutes</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Guest Count</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{search.guestCount} {search.guestCount === 1 ? 'guest' : 'guests'}</dd>
        </dl>

        {Object.keys(fieldErrors).length > 0 && (
          <div className="active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            {Object.entries(fieldErrors).map(([name, message]) => (
              <p key={name} style={{ color: '#991b1b', margin: '0.2rem 0' }}>{message}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
            {error.includes('search again') && (
              <Link to="/availability" state={{ search }} className="bistro-button-outline" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
                Return to availability search
              </Link>
            )}
            {error.includes('sign in') && (
              <Link to="/login" className="bistro-button-gold" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
                Sign in
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          className="bistro-button-gold"
          onClick={submit}
          disabled={submitting}
          aria-describedby="reservation-submit-status"
          style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
        >
          {submitting ? 'Confirming reservation…' : 'Confirm Reservation'}
        </button>
        <p id="reservation-submit-status" role="status" style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', textAlign: 'center', marginTop: '0.65rem' }}>
          {submitting ? 'Your reservation is being confirmed. Please do not close this window.' : ''}
        </p>
      </section>
    </div>
  );
}
