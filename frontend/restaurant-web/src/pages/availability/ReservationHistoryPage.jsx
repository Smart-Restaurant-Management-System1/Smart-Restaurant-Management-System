import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReservationHistory } from '../../services/tableService';
import { formatReservationDateTime, isUpcomingReservation, statusClassName } from './reservationHistoryView';
import PageHeader from '../../components/common/PageHeader';

function formatScheduleWindow(start, end) {
  if (!start) return '—';
  const startStr = formatReservationDateTime(start);
  if (!end) return startStr;
  const endStr = formatReservationDateTime(end);
  const startDate = startStr.slice(0, 10);
  const endDate = endStr.slice(0, 10);
  const startTime = startStr.slice(11, 16);
  const endTime = endStr.slice(11, 16);

  if (startDate === endDate) {
    return `${startDate} · ${startTime} – ${endTime}`;
  }
  return `${startStr} – ${endStr}`;
}

function ReservationTable({ reservations }) {
  return (
    <div
      className="bistro-card"
      style={{
        position: 'relative',
        background: '#ffffff',
        border: '1px solid #eedfc9',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
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
          zIndex: 1,
        }}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f5efe6', borderBottom: '1px solid #dfd8cb' }}>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                Reference & Table
              </th>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                Visit Schedule
              </th>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                Party Size
              </th>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                Booked On
              </th>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                Status
              </th>
              <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d', textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation, idx) => {
              const isConfirmed = reservation.status === 'Confirmed';
              const isPending = reservation.status === 'Pending';
              return (
                <tr
                  key={reservation.reservationId}
                  style={{
                    borderBottom: idx === reservations.length - 1 ? 'none' : '1px solid #eee5d7',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Reference & Table */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #faf5ec 0%, #f4ebd9 100%)',
                          border: '1px solid #eedfc9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c5a059',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18v3" />
                          <path d="M20 18v3" />
                          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                        </svg>
                      </div>
                      <div>
                        <span
                          className="reservation-reference"
                          style={{
                            display: 'inline-block',
                            color: '#8c6736',
                            background: '#faf5ec',
                            border: '1px solid #eedfc9',
                            borderRadius: '5px',
                            padding: '0.12rem 0.45rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            fontFamily: 'monospace',
                            marginBottom: '0.2rem',
                          }}
                        >
                          #{reservation.bookingReference}
                        </span>
                        <div
                          style={{
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#282115',
                          }}
                        >
                          Table {reservation.tableNumber}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Visit Schedule */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#282115', fontWeight: 600, fontSize: '0.88rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatScheduleWindow(reservation.startDateTime, reservation.endDateTime)}</span>
                    </div>
                  </td>

                  {/* Party Size */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.86rem', color: '#443a2d' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span>{reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}</span>
                    </div>
                  </td>

                  {/* Booked On */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#78716c' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatReservationDateTime(reservation.createdAt)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span
                      className={statusClassName(reservation.status)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      {(isConfirmed || isPending) && (
                        <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
                      )}
                      {reservation.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '0.9rem 1.15rem', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link
                      className="bistro-button-outline"
                      to={'/reservations/' + reservation.reservationId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.42rem 0.85rem',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                      }}
                    >
                      <span>Manage Booking</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReservationCard({ reservation }) {
  const isConfirmed = reservation.status === 'Confirmed';
  const isPending = reservation.status === 'Pending';

  return (
    <article
      className="reservation-history-card bistro-card bistro-journey-card"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '1px solid #eedfc9',
        borderRadius: '12px',
        padding: '1.5rem',
        overflow: 'hidden',
        boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
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

      <div>
        <div className="reservation-history-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.75rem' }}>
          <div>
            <span
              className="reservation-reference"
              style={{
                display: 'inline-block',
                color: '#8c6736',
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                borderRadius: '6px',
                padding: '0.2rem 0.55rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
                marginBottom: '0.4rem',
              }}
            >
              #{reservation.bookingReference}
            </span>
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '1.28rem',
                margin: 0,
                color: '#282115',
                fontWeight: 600,
              }}
            >
              Table {reservation.tableNumber}
            </h2>
          </div>

          <span
            className={statusClassName(reservation.status)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            {(isConfirmed || isPending) && (
              <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
            )}
            {reservation.status}
          </span>
        </div>

        <dl style={{ margin: '0 0 1.25rem 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.45rem 1rem', fontSize: '0.86rem' }}>
          <dt style={{ color: '#78716c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Visit Window
          </dt>
          <dd style={{ color: '#282115', fontWeight: 600, margin: 0 }}>
            {formatScheduleWindow(reservation.startDateTime, reservation.endDateTime)}
          </dd>

          <dt style={{ color: '#78716c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Party Size
          </dt>
          <dd style={{ color: '#282115', margin: 0 }}>
            {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
          </dd>

          <dt style={{ color: '#78716c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Booked On
          </dt>
          <dd style={{ color: '#78716c', margin: 0 }}>
            {formatReservationDateTime(reservation.createdAt)}
          </dd>
        </dl>
      </div>

      <Link
        className="bistro-button-outline"
        to={'/reservations/' + reservation.reservationId}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          justifyContent: 'center',
          textDecoration: 'none',
          padding: '0.55rem 1rem',
          fontSize: '0.84rem',
        }}
      >
        <span>Manage Booking</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export default function ReservationHistoryPage() {
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');

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
    <div className="reservation-history-page-content" style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="My Reservations"
        title={<>Your Booking <em>History</em></>}
        subtitle="Review upcoming dining reservations and previous visits. Manage or reschedule your bookings directly."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f5efe6',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e5dac9',
                marginRight: '0.25rem',
              }}
              role="group"
              aria-label="View layout switcher"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#282115' : '#78716c',
                  fontWeight: viewMode === 'list' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(40, 30, 15, 0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
                title="List View"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? '#282115' : '#78716c',
                  fontWeight: viewMode === 'cards' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(40, 30, 15, 0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
                title="Cards View"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Cards</span>
              </button>
            </div>

            <Link to="/availability" className="bistro-button-gold">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Find a Table
            </Link>
            <Link to="/tables" className="bistro-button-outline">
              + View All Tables
            </Link>
          </div>
        }
      />

      {error && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
          <button type="button" className="bistro-button-gold" onClick={() => load(page)}>
            Try Again
          </button>
        </div>
      )}

      {!history && !error && (
        <div
          className="availability-state"
          role="status"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            color: '#78716c',
            textAlign: 'center',
            padding: '3rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid rgba(197, 160, 89, 0.25)',
              borderTopColor: '#c5a059',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ margin: 0, fontSize: '0.92rem', fontStyle: 'italic' }}>
            Loading your reservations…
          </p>
        </div>
      )}

      {history && items.length === 0 && (
        <div
          className="bistro-card"
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#faf5ec',
              border: '1px solid #eedfc9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#c5a059',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.25rem', color: '#282115', margin: '0 0 0.5rem' }}>
            No Reservations Found
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#78716c', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            You do not have any reservations yet. Pull up a chair and make yourself at home at Cinnamon Bistro.
          </p>
          <Link className="bistro-button-gold" to="/availability">
            Find an Available Table <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {history && items.length > 0 && (
        <>
          <section className="reservation-history-section" aria-labelledby="upcoming-heading" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h2 id="upcoming-heading" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.35rem', color: '#282115', margin: 0, fontWeight: 600 }}>
                Upcoming <em>Visits</em>
              </h2>
              <span
                style={{
                  background: '#faf5ec',
                  color: '#8c6736',
                  border: '1px solid #eedfc9',
                  borderRadius: '9999px',
                  padding: '0.15rem 0.6rem',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {upcoming.length}
              </span>
            </div>

            {upcoming.length ? (
              viewMode === 'list' ? (
                <ReservationTable reservations={upcoming} />
              ) : (
                <div
                  className="reservation-history-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {upcoming.map((item) => (
                    <ReservationCard key={item.reservationId} reservation={item} />
                  ))}
                </div>
              )
            ) : (
              <p className="reservation-history-empty" style={{ color: '#78716c', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                No upcoming reservations on this page.
              </p>
            )}
          </section>

          <section className="reservation-history-section" aria-labelledby="past-heading" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h2 id="past-heading" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.35rem', color: '#282115', margin: 0, fontWeight: 600 }}>
                Previous & Cancelled <em>Visits</em>
              </h2>
              <span
                style={{
                  background: '#faf5ec',
                  color: '#8c6736',
                  border: '1px solid #eedfc9',
                  borderRadius: '9999px',
                  padding: '0.15rem 0.6rem',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {past.length}
              </span>
            </div>

            {past.length ? (
              viewMode === 'list' ? (
                <ReservationTable reservations={past} />
              ) : (
                <div
                  className="reservation-history-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {past.map((item) => (
                    <ReservationCard key={item.reservationId} reservation={item} />
                  ))}
                </div>
              )
            ) : (
              <p className="reservation-history-empty" style={{ color: '#78716c', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                No previous or cancelled reservations on this page.
              </p>
            )}
          </section>

          {history.totalPages > 1 && (
            <nav className="reservation-pagination" aria-label="Reservation history pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="bistro-button-outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.86rem', color: '#574e3f', fontWeight: 600 }}>
                Page {history.page} of {history.totalPages}
              </span>
              <button
                type="button"
                className="bistro-button-outline"
                disabled={page >= history.totalPages}
                onClick={() => setPage(page + 1)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
