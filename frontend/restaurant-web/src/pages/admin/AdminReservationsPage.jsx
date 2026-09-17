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

  const changeStatus = async (item, status) => {
    if (!window.confirm(`Change ${item.bookingReference} to ${status}?`)) return;
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
                      onClick={() => changeStatus(item, 'Confirmed')}
                      className="bistro-button-gold"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    disabled={pending === item.reservationId}
                    onClick={() => changeStatus(item, 'Cancelled')}
                    className="bistro-button-outline"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', color: '#991b1b', borderColor: '#fca5a5' }}
                  >
                    Cancel
                  </button>
                  {item.status === 'Confirmed' && (
                    <button
                      disabled={pending === item.reservationId}
                      onClick={() => changeStatus(item, 'Completed')}
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
    </div>
  );
}
