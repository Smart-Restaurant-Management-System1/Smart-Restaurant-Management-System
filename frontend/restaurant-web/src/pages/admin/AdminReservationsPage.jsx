import React, { useEffect, useState } from 'react';
import { getAdminReservations, updateAdminReservationStatus } from '../../services/tableService';
import { formatReservationDateTime, statusClassName } from '../availability/reservationHistoryView';
import PageHeader from '../../components/common/PageHeader';

const initialFilters = { visitFrom: '', visitTo: '', status: '', tableNumber: '', bookingReference: '', page: 1, pageSize: 20 };

export default function AdminReservationsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);

  const load = async (next = filters) => {
    setData(null);
    setError('');
    try {
      setData(await getAdminReservations(next));
    } catch (e) {
      setError(e?.response?.status === 403 ? 'You are not authorised to manage reservations.' : 'Unable to load reservations. Please try again.');
    }
  };

  useEffect(() => {
    load(filters);
  }, [filters.page]);

  const submit = (event) => {
    event.preventDefault();
    setFilters({ ...filters, page: 1 });
    load({ ...filters, page: 1 });
  };

  const promptChangeStatus = (item, status) => {
    setStatusConfirm({ item, status });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { item, status } = statusConfirm;
    setStatusConfirm(null);
    setPending(item.reservationId);
    try {
      await updateAdminReservationStatus(item.reservationId, status);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'The status could not be changed. Refresh and try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="admin-reservations-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Operations Management"
        title={<>Reservation <em>Management</em></>}
        subtitle="Filter daily bookings, inspect customer details, and apply permitted reservation lifecycle actions."
      />

      {/* Filter Form Card */}
      <form className="availability-form admin-reservation-filters bistro-card" onSubmit={submit} style={{ marginBottom: '2rem' }}>
        <div className="availability-fields">
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            From
            <input type="date" value={filters.visitFrom} onChange={(e) => setFilters({ ...filters, visitFrom: e.target.value })} style={{ marginTop: '0.35rem' }} />
          </label>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            To
            <input type="date" value={filters.visitTo} onChange={(e) => setFilters({ ...filters, visitTo: e.target.value })} style={{ marginTop: '0.35rem' }} />
          </label>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            Status
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ marginTop: '0.35rem' }}>
              <option value="">All Statuses</option>
              {['Pending', 'Confirmed', 'Cancelled', 'Completed'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            Table
            <input placeholder="e.g. T-01" value={filters.tableNumber} onChange={(e) => setFilters({ ...filters, tableNumber: e.target.value })} style={{ marginTop: '0.35rem' }} />
          </label>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            Booking Reference
            <input placeholder="e.g. CB-12345" value={filters.bookingReference} onChange={(e) => setFilters({ ...filters, bookingReference: e.target.value })} style={{ marginTop: '0.35rem' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <button className="bistro-button-gold" type="submit">Apply Filters</button>
          <button className="bistro-button-outline" type="button" onClick={() => { setFilters(initialFilters); load(initialFilters); }}>
            Reset Filters
          </button>
        </div>
      </form>

      {error && <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b' }}>{error}</div>}
      {!data && !error && <div className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>Loading reservations…</div>}
      {data?.items?.length === 0 && <div className="bistro-card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--bistro-muted)' }}>No reservations match these filters.</div>}

      {data?.items?.length > 0 && (
        <div className="admin-reservation-list">
          {data.items.map((item) => (
            <article key={item.reservationId} className="reservation-history-card bistro-card">
              <div className="reservation-history-card-header">
                <div>
                  <p className="reservation-reference" style={{ color: 'var(--bistro-bronze)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em' }}>{item.bookingReference}</p>
                  <h2 style={{ fontSize: '1.35rem', margin: '0.2rem 0', color: 'var(--bistro-ink)' }}>Table {item.tableNumber}</h2>
                  <small style={{ color: 'var(--bistro-muted)', fontSize: '0.82rem' }}>Customer ID #{item.customerId}</small>
                </div>
                <span className={statusClassName(item.status)}>{item.status}</span>
              </div>
              <p style={{ color: 'var(--bistro-muted)', fontSize: '0.92rem', margin: '0.75rem 0' }}>
                {formatReservationDateTime(item.startDateTime)} – {formatReservationDateTime(item.endDateTime)} · {item.guestCount} {item.guestCount === 1 ? 'guest' : 'guests'}
              </p>
              {['Pending', 'Confirmed'].includes(item.status) && (
                <div className="admin-reservation-actions" style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  {item.status === 'Pending' && (
                    <button
                      disabled={pending === item.reservationId}
                      onClick={() => promptChangeStatus(item, 'Confirmed')}
                      className="bistro-button-gold"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    disabled={pending === item.reservationId}
                    onClick={() => promptChangeStatus(item, 'Cancelled')}
                    className="bistro-button-outline"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', color: '#991b1b', borderColor: '#fca5a5' }}
                  >
                    Cancel
                  </button>
                  {item.status === 'Confirmed' && (
                    <button
                      disabled={pending === item.reservationId}
                      onClick={() => promptChangeStatus(item, 'Completed')}
                      className="bistro-button-dark"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {data?.totalPages > 1 && (
        <nav className="reservation-pagination" aria-label="Reservation management pagination" style={{ marginTop: '2rem' }}>
          <button className="btn-jelly-secondary" disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
            Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Page {data.page} of {data.totalPages}</span>
          <button className="btn-jelly-secondary" disabled={filters.page >= data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
            Next
          </button>
        </nav>
      )}

      {/* Luxury Status Confirmation Modal */}
      {statusConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="statusConfirmTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setStatusConfirm(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="bistro-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '2.2rem 2rem',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(17, 24, 39, 0.25)',
              textAlign: 'center',
              border: '1px solid #e5e7eb',
              animation: 'modalPopupReveal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: statusConfirm.status === 'Cancelled' ? '#fef2f2' : '#fef3c7',
                color: statusConfirm.status === 'Cancelled' ? '#dc2626' : '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: statusConfirm.status === 'Cancelled' ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(212, 175, 55, 0.3)',
              }}
            >
              {statusConfirm.status === 'Cancelled' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
              )}
            </div>

            <h2
              id="statusConfirmTitle"
              style={{
                fontSize: '1.35rem',
                fontFamily: 'Georgia, serif',
                margin: '0 0 0.5rem 0',
                color: 'var(--bistro-ink)',
              }}
            >
              Update Reservation Status?
            </h2>

            <p style={{ color: 'var(--bistro-muted)', fontSize: '0.92rem', lineHeight: '1.55', marginBottom: '1.75rem' }}>
              Change booking <strong style={{ color: 'var(--bistro-ink)' }}>{statusConfirm.item.bookingReference}</strong> (Table {statusConfirm.item.tableNumber}) status to{' '}
              <span className={statusClassName(statusConfirm.status)} style={{ display: 'inline-block', margin: '0 0.2rem' }}>
                {statusConfirm.status}
              </span>
              ?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setStatusConfirm(null)}
                disabled={Boolean(pending)}
                className="bistro-button-outline"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={Boolean(pending)}
                className={statusConfirm.status === 'Cancelled' ? 'bistro-button-danger' : 'bistro-button-gold'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {pending ? 'Updating…' : `Confirm ${statusConfirm.status}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
