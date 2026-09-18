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

      <section
        className="reservation-confirmation bistro-card"
        aria-labelledby="confirmation-heading"
        tabIndex="-1"
        style={{
          position: 'relative',
          background: '#ffffff',
          border: '1px solid #eedfc9',
          borderRadius: '12px',
          padding: '2.25rem',
          boxShadow: '0 4px 18px rgba(40, 33, 21, 0.05)',
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

        {/* Celebratory Success Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.75rem',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1px solid #bbf7d0',
            padding: '1.1rem 1.35rem',
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(22, 101, 52, 0.1)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.1rem', color: '#14532d', margin: 0, fontWeight: 600 }}>
              Reservation Confirmed Successfully!
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#15803d', margin: '0.2rem 0 0' }}>
              We look forward to welcoming you to Cinnamon Bistro for an exquisite dining experience.
            </p>
          </div>
        </div>

        {/* Reference Highlight Box */}
        <div
          style={{
            background: '#faf5ec',
            border: '1px dashed #c5a059',
            borderRadius: '10px',
            padding: '1.15rem 1.5rem',
            marginBottom: '1.75rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8c6736', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
            Official Booking Reference
          </span>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.85rem', fontWeight: 700, color: '#282115', letterSpacing: '0.04em' }}>
            {reservation.bookingReference}
          </span>
        </div>

        {/* Summary Grid */}
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            margin: '0 0 2rem 0',
          }}
        >
          <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Reserved Table
            </dt>
            <dd style={{ color: '#282115', fontSize: '1.05rem', fontWeight: 600, margin: 0, fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Table {reservation.tableNumber}
            </dd>
          </div>

          <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Seating Schedule
            </dt>
            <dd style={{ color: '#282115', fontSize: '0.92rem', fontWeight: 600, margin: 0 }}>
              {formatRestaurantDateTime(reservation.startDateTime)} – {formatRestaurantDateTime(reservation.endDateTime)}
            </dd>
          </div>

          <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Party Size
            </dt>
            <dd style={{ color: '#282115', fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
              {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
            </dd>
          </div>

          <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Booking Status
            </dt>
            <dd style={{ margin: 0 }}>
              <span
                className="reservation-status-pending"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
                {reservation.status}
              </span>
            </dd>
          </div>
        </dl>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Link className="bistro-button-gold" to="/portal" style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}>
            Dining Dashboard <span aria-hidden="true">→</span>
          </Link>
          <Link className="bistro-button-outline" to="/reservations/history" style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}>
            View My Reservations
          </Link>
          <Link className="bistro-button-outline" to="/menu" style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}>
            Browse Menu
          </Link>
        </div>
      </section>
    </div>
  );
}
