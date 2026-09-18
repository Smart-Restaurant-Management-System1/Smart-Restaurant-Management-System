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

      <section
        className="reservation-review bistro-card"
        aria-label="Reservation review"
        style={{
          position: 'relative',
          background: '#ffffff',
          border: '1px solid #eedfc9',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(40, 33, 21, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Top Gold Gradient Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
          }}
        />

        {/* Selected Table Header Block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fcf9f5',
            border: '1px solid #eedfc9',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #eedfc9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c5a059',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18v3" />
                <path d="M20 18v3" />
                <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.3rem', color: '#282115', margin: 0, fontWeight: 600 }}>
                Table {table.tableNumber}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#78716c', margin: '0.15rem 0 0' }}>
                {table.seatingCapacity} seats · {table.location || 'Main Dining Hall'}
              </p>
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#ecfdf5',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '9999px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
            Ready for Booking
          </span>
        </div>

        {/* Reservation Details Grid */}
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            margin: '0 0 1.5rem 0',
          }}
        >
          <div style={{ background: '#ffffff', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Visit Date
            </dt>
            <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {search.date}
            </dd>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Seating Window
            </dt>
            <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {search.startTime} – {search.endTime}
            </dd>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="6" x2="12" y2="12" />
                <line x1="12" y1="12" x2="15" y2="15" />
              </svg>
              Reserved Duration
            </dt>
            <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {search.durationMinutes} minutes
            </dd>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              Party Size
            </dt>
            <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {search.guestCount} {search.guestCount === 1 ? 'guest' : 'guests'}
            </dd>
          </div>
        </dl>

        {/* Security & Guarantee Note */}
        <div
          style={{
            background: '#faf5ec',
            border: '1px solid #eedfc9',
            borderRadius: '8px',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: '0.82rem', color: '#6b532f', lineHeight: 1.4 }}>
            Your table reservation will be held exclusively for you upon confirmation under Cinnamon Bistro booking policies.
          </span>
        </div>

        {Object.keys(fieldErrors).length > 0 && (
          <div className="active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            {Object.entries(fieldErrors).map(([name, message]) => (
              <p key={name} style={{ color: '#991b1b', margin: '0.2rem 0', fontSize: '0.86rem' }}>{message}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            <p style={{ color: '#991b1b', margin: 0, fontSize: '0.88rem' }}>{error}</p>
            {error.includes('search again') && (
              <Link to="/availability" state={{ search }} className="bistro-button-outline" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
                Return to availability search
              </Link>
            )}
            {error.includes('sign in') && (
              <Link to="/login" className="bistro-button-gold" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
                Sign In
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
          style={{ width: '100%', padding: '0.75rem 1.5rem', fontSize: '0.95rem', justifyContent: 'center' }}
        >
          {submitting ? 'Securing Your Table…' : 'Confirm & Reserve Table'}
        </button>
        <p id="reservation-submit-status" role="status" style={{ fontSize: '0.84rem', color: '#78716c', textAlign: 'center', marginTop: '0.65rem' }}>
          {submitting ? 'Your reservation is being confirmed. Please do not close this window.' : ''}
        </p>
      </section>
    </div>
  );
}
