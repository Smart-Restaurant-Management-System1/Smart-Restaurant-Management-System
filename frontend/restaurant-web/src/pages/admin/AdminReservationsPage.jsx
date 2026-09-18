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

  // Calculate summary metrics for header chips
  const totalLoaded = data?.totalCount ?? (data?.items?.length || 0);
  const confirmedCount = data?.items?.filter((i) => i.status === 'Confirmed').length || 0;
  const pendingCount = data?.items?.filter((i) => i.status === 'Pending').length || 0;
  const otherCount = data?.items?.filter((i) => ['Completed', 'Cancelled'].includes(i.status)).length || 0;

  return (
    <div className="admin-reservations-page-content">
      {/* Unified Page Header with Luxury KPI Badges */}
      <PageHeader
        eyebrow="Operations Management"
        title={<>Reservation <em>Management</em></>}
        subtitle="Filter daily bookings, inspect customer details, and apply permitted reservation lifecycle actions."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Total Bookings Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                background: '#faf6ee',
                border: '1px solid #dfd5c4',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(40, 30, 15, 0.04)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#282115" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600 }}>Total</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: 'var(--bistro-ink)' }}>{totalLoaded}</strong>
            </div>

            {/* Confirmed Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                background: '#eef7ee',
                border: '1px solid #bfe3c3',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(40, 30, 15, 0.04)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', fontWeight: 600 }}>Confirmed</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1b6927' }}>{confirmedCount}</strong>
            </div>

            {/* Pending Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                background: '#fdf6ea',
                border: '1px solid #f9dfb6',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(40, 30, 15, 0.04)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b25e00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b25e00', fontWeight: 600 }}>Pending</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#b25e00' }}>{pendingCount}</strong>
            </div>

            {/* Completed/Other Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                background: '#f4f6fa',
                border: '1px solid #d5dceb',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(40, 30, 15, 0.04)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b5998" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b5998', fontWeight: 600 }}>Closed</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#3b5998' }}>{otherCount}</strong>
            </div>
          </div>
        }
      />

      {/* Filter Form Card */}
      <form
        className="admin-reservation-filters bistro-card"
        onSubmit={submit}
        style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
        }}
      >
        {/* Luxury Gold Top Strip Accent */}
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

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* From Date */}
          <div style={{ flex: '1 1 120px', minWidth: '115px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              From Date
            </label>
            <input
              type="date"
              value={filters.visitFrom}
              onChange={(e) => setFilters({ ...filters, visitFrom: e.target.value })}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                backgroundColor: '#faf8f4',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: '1 1 120px', minWidth: '115px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              To Date
            </label>
            <input
              type="date"
              value={filters.visitTo}
              onChange={(e) => setFilters({ ...filters, visitTo: e.target.value })}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                backgroundColor: '#faf8f4',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* Status */}
          <div style={{ flex: '1 1 125px', minWidth: '115px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                backgroundColor: '#faf8f4',
                color: 'var(--bistro-ink)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              {['Pending', 'Confirmed', 'Cancelled', 'Completed'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div style={{ flex: '1 1 95px', minWidth: '85px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Table
            </label>
            <input
              placeholder="e.g. T-01"
              value={filters.tableNumber}
              onChange={(e) => setFilters({ ...filters, tableNumber: e.target.value })}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                backgroundColor: '#faf8f4',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* Booking Reference */}
          <div style={{ flex: '1.2 1 135px', minWidth: '115px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Booking Reference
            </label>
            <input
              placeholder="e.g. CB-12345"
              value={filters.bookingReference}
              onChange={(e) => setFilters({ ...filters, bookingReference: e.target.value })}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                backgroundColor: '#faf8f4',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, paddingBottom: '1px' }}>
            <button
              className="bistro-button-gold"
              type="submit"
              style={{
                padding: '0.54rem 1.15rem',
                fontSize: '0.86rem',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Apply Filters
            </button>
            <button
              className="bistro-button-outline"
              type="button"
              onClick={() => { setFilters(initialFilters); load(initialFilters); }}
              style={{
                padding: '0.54rem 1rem',
                fontSize: '0.86rem',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </form>

      {error && <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b' }}>{error}</div>}
      {!data && !error && <div className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>Loading reservations…</div>}
      {data?.items?.length === 0 && <div className="bistro-card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--bistro-muted)' }}>No reservations match these filters.</div>}

      {data?.items?.length > 0 && (
        <div
          className="bistro-card"
          style={{
            padding: 0,
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid #e8e0d0',
            borderRadius: '14px',
            boxShadow: '0 6px 22px rgba(40, 30, 15, 0.06)',
          }}
        >
          {/* Luxury Gold Top Strip Accent */}
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

          <div
            style={{
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid #eee5d7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.28rem', fontWeight: 700, color: 'var(--bistro-ink)', margin: 0 }}>
                Reservations Roster
              </h2>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  backgroundColor: '#f5eedf',
                  color: '#8c6736',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: '1px solid #ebdcc5',
                }}
              >
                {data.items.length} {data.items.length === 1 ? 'Booking' : 'Bookings'} · Page {data.page} of {data.totalPages}
              </span>
            </div>
            <button
              type="button"
              className="bistro-button-outline"
              onClick={() => load(filters)}
              style={{
                padding: '0.48rem 0.95rem',
                fontSize: '0.84rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
              title="Refresh reservations list"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f5efe6', borderBottom: '1px solid #dfd8cb' }}>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Reference
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Table
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Customer
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Date & Schedule
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Party Size
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d', textAlign: 'right', minWidth: '150px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr
                    key={item.reservationId}
                    style={{
                      borderBottom: idx === data.items.length - 1 ? 'none' : '1px solid #eee5d7',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Reference */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          background: '#faf6ee',
                          border: '1px solid #e2d1ba',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'var(--bistro-bronze)',
                          fontSize: '0.88rem',
                          boxShadow: '0 1px 2px rgba(40, 30, 15, 0.04)',
                        }}
                      >
                        {item.bookingReference}
                      </span>
                    </td>

                    {/* Table */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontFamily: 'Georgia, serif',
                          fontWeight: 700,
                          color: 'var(--bistro-ink)',
                          fontSize: '0.95rem',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18v3" />
                          <path d="M20 18v3" />
                          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                        </svg>
                        Table {item.tableNumber}
                      </div>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#faf4eb',
                            border: '1px solid #e8dec8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#8c6736',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                          }}
                        >
                          C
                        </div>
                        <span style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
                          Customer #{item.customerId}
                        </span>
                      </div>
                    </td>

                    {/* Date & Schedule */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem', color: 'var(--bistro-ink)', fontWeight: 500 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8c6736" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{formatReservationDateTime(item.startDateTime)} – {formatReservationDateTime(item.endDateTime)}</span>
                      </div>
                    </td>

                    {/* Party Size */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          background: '#faf6ee',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#6b532f',
                          border: '1px solid #ebdcc5',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8c6736" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {item.guestCount} {item.guestCount === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className={statusClassName(item.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.status === 'Confirmed' && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 2.5px rgba(16, 185, 129, 0.2)' }} />
                        )}
                        {item.status === 'Pending' && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', boxShadow: '0 0 0 2.5px rgba(245, 158, 11, 0.2)' }} />
                        )}
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {item.status === 'Pending' && (
                          <button
                            disabled={pending === item.reservationId}
                            onClick={() => promptChangeStatus(item, 'Confirmed')}
                            className="bistro-button-gold"
                            style={{ padding: '0.38rem 0.85rem', fontSize: '0.8rem', borderRadius: '6px' }}
                            title="Confirm reservation"
                          >
                            Confirm
                          </button>
                        )}
                        {item.status === 'Confirmed' && (
                          <button
                            disabled={pending === item.reservationId}
                            onClick={() => promptChangeStatus(item, 'Completed')}
                            className="bistro-button-dark"
                            style={{ padding: '0.38rem 0.85rem', fontSize: '0.8rem', borderRadius: '6px' }}
                            title="Mark as completed"
                          >
                            Complete
                          </button>
                        )}
                        {['Pending', 'Confirmed'].includes(item.status) && (
                          <button
                            disabled={pending === item.reservationId}
                            onClick={() => promptChangeStatus(item, 'Cancelled')}
                            className="bistro-button-outline"
                            style={{ padding: '0.38rem 0.85rem', fontSize: '0.8rem', color: '#991b1b', borderColor: '#fca5a5', borderRadius: '6px' }}
                            title="Cancel reservation"
                          >
                            Cancel
                          </button>
                        )}
                        {!['Pending', 'Confirmed'].includes(item.status) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontStyle: 'italic' }}>
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.totalPages > 1 && (
        <nav
          className="reservation-pagination"
          aria-label="Reservation management pagination"
          style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
        >
          <button
            className="bistro-button-outline"
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.86rem' }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', fontWeight: 500 }}>
            Page <strong style={{ color: 'var(--bistro-ink)' }}>{data.page}</strong> of <strong style={{ color: 'var(--bistro-ink)' }}>{data.totalPages}</strong>
          </span>
          <button
            className="bistro-button-outline"
            disabled={filters.page >= data.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.86rem' }}
          >
            Next →
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
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
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
              boxShadow: '0 25px 50px -12px rgba(17, 24, 39, 0.35)',
              textAlign: 'center',
              border: '1px solid #e8e0d0',
              animation: 'modalPopupReveal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Modal Top Gold Accent Strip */}
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
                fontWeight: 700,
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
                style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={Boolean(pending)}
                className={statusConfirm.status === 'Cancelled' ? 'bistro-button-danger' : 'bistro-button-gold'}
                style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 1.25rem' }}
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
