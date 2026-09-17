import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';

function formatRestaurantDateTime(value) {
  return String(value ?? '').replace('T', ' ').slice(0, 16);
}

export default function ReservationConfirmationPage() {
  const reservation = useLocation().state?.reservation;

  if (!reservation) {
    return (
      <div className="reservation-confirmation-page-content" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Reservation Status"
          title="No Confirmed Reservation Found"
          subtitle="For security, confirmation details are presented immediately after successful table creation."
        />
        <div className="availability-state bistro-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: '#4b5563', marginBottom: '1.25rem' }}>No reservation data was found in current session context.</p>
          <Link to="/availability" className="btn-jelly-primary" style={{ textDecoration: 'none' }}>
            Search Available Tables
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-confirmation-page-content" style={{ maxWidth: '780px', margin: '0 auto' }}>
      <PageHeader
        eyebrow="Booking Confirmed"
        title={<>Your Table Is <em>Reserved</em></>}
        subtitle={`Your booking reference is ${reservation.bookingReference}. Your reservation has been recorded in our system.`}
      />

      <section className="reservation-confirmation bistro-card" aria-labelledby="confirmation-heading" tabIndex="-1" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', background: '#edf7ee', border: '1px solid #c2e2c6', padding: '0.9rem 1.25rem', borderRadius: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span style={{ color: '#1e5e29', fontWeight: 600, fontSize: '0.95rem' }}>
            Reservation #{reservation.reservationId} successfully booked!
          </span>
        </div>

        <dl>
          <dt style={{ color: 'var(--bistro-muted)' }}>Reference</dt>
          <dd><strong style={{ color: 'var(--bistro-bronze)', fontFamily: 'Georgia, serif', fontSize: '1.05rem', letterSpacing: '0.04em' }}>{reservation.bookingReference}</strong></dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Table</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>Table {reservation.tableNumber}</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Visit Window</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{formatRestaurantDateTime(reservation.startDateTime)} – {formatRestaurantDateTime(reservation.endDateTime)}</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Guests</dt>
          <dd style={{ color: 'var(--bistro-ink)' }}>{reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}</dd>
          <dt style={{ color: 'var(--bistro-muted)' }}>Status</dt>
          <dd>
            <span className="reservation-status-pending">
              {reservation.status}
            </span>
          </dd>
        </dl>

        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link className="bistro-button-gold" to="/portal" style={{ flex: 1, minWidth: '200px' }}>
            Go to Dining Dashboard <span aria-hidden="true">→</span>
          </Link>
          <Link className="bistro-button-outline" to="/reservations/history" style={{ flex: 1, minWidth: '200px' }}>
            View My Reservations
          </Link>
        </div>
      </section>
    </div>
  );
}
