import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { reservationApi } from '../../services/tableService';
import PageHeader from '../../components/common/PageHeader';

const STATUS_COLORS = {
  Confirmed: '#166534',
  Pending: '#92400e',
  Completed: '#1e40af',
  Cancelled: '#991b1b'
};

const TABLE_BAR_COLOR = '#b45309';

const getDefaultDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  };
};

export default function ReservationReportsPage() {
  const [filters, setFilters] = useState(getDefaultDates());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');

  const loadReport = async (activeFilters = filters) => {
    if (activeFilters.from && activeFilters.to && activeFilters.from > activeFilters.to) {
      setError('From date must not be later than To date.');
      return;
    }
    setLoading(true);
    setError('');
    setExportError('');
    try {
      const response = await reservationApi.get('/reports/reservations', {
        params: {
          from: activeFilters.from || undefined,
          to: activeFilters.to || undefined
        }
      });
      setReport(response.data);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError('You are not authorized to view reservation reports.');
      } else {
        setError(err?.response?.data?.message || 'Unable to load reservation reports. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(getDefaultDates());
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadReport(filters);
  };

  const handleReset = () => {
    const defaults = getDefaultDates();
    setFilters(defaults);
    loadReport(defaults);
  };

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    setExportError('');

    try {
      const response = await reservationApi.get('/reports/reservations/export', {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          format
        },
        responseType: 'blob'
      });

      const disposition = response.headers?.['content-disposition'] || '';
      let filename = `reservation-report-${filters.from}-to-${filters.to}.${format}`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }

      const blob = new Blob([response.data], {
        type: format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err?.response?.data?.message || `Failed to export ${format.toUpperCase()} report. Please try again.`);
    } finally {
      setExporting('');
    }
  };

  const summary = report?.summary;
  const bookingsPerDay = report?.bookingsPerDay || [];
  const tableShare = report?.tableReservationShare || [];

  const statusDistributionData = summary ? [
    { name: 'Confirmed', value: summary.confirmedReservations },
    { name: 'Pending', value: summary.pendingReservations },
    { name: 'Completed', value: summary.completedReservations },
    { name: 'Cancelled', value: summary.cancelledReservations }
  ].filter(item => item.value > 0) : [];

  const hasData = summary && summary.totalReservations > 0;

  return (
    <div className="reservation-reports-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Analytics & Operations"
        title={<>Reservation Reports & <em>Analytics</em></>}
        subtitle="Analyze reservation booking volume, cancellation patterns, and table share across the restaurant."
      />

      {/* Date Filter & Export Bar */}
      <form
        className="availability-form admin-reservation-filters bistro-card"
        onSubmit={handleFilterSubmit}
        style={{
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
          padding: '1.25rem 1.5rem',
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

        <div className="availability-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ fontSize: '0.84rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            From Date
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              disabled={loading}
              style={{
                marginTop: '0.35rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                padding: '0.52rem 0.65rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </label>
          <label style={{ fontSize: '0.84rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            To Date
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              disabled={loading}
              style={{
                marginTop: '0.35rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                padding: '0.52rem 0.65rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          <button
            className="bistro-button-gold"
            type="submit"
            disabled={loading}
            style={{
              padding: '0.55rem 1.2rem',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {loading ? 'Loading…' : 'Apply Range'}
          </button>
          <button
            className="bistro-button-outline"
            type="button"
            onClick={handleReset}
            disabled={loading}
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Reset (30 Days)
          </button>
          <button
            className="bistro-button-outline"
            type="button"
            disabled={loading || !!exporting}
            onClick={() => handleExport('csv')}
            style={{
              marginLeft: 'auto',
              padding: '0.55rem 1rem',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
          </button>
          <button
            className="bistro-button-dark"
            type="button"
            disabled={loading || !!exporting}
            onClick={() => handleExport('xlsx')}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            {exporting === 'xlsx' ? 'Exporting Excel…' : 'Export Excel'}
          </button>
        </div>
      </form>

      {/* Alert States */}
      {error && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b' }}>
          <p style={{ margin: 0 }}><strong>Error:</strong> {error}</p>
        </div>
      )}
      {exportError && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b' }}>
          <p style={{ margin: 0 }}><strong>Export Error:</strong> {exportError}</p>
        </div>
      )}
      {loading && (
        <div className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem' }}>
          <svg
            style={{
              animation: 'spin 1s linear infinite',
              width: '28px',
              height: '28px',
              margin: '0 auto 0.75rem',
              display: 'block',
              color: '#c5a059',
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.94rem' }}>Loading reservation report data…</span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      {summary && (
        <section aria-label="Report summary" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.45rem', color: 'var(--bistro-ink)', margin: 0 }}>
              Summary <em>Overview</em>
            </h2>
            <span style={{ fontSize: '0.84rem', color: 'var(--bistro-muted)', background: '#faf6ee', border: '1px solid #ebdcc5', borderRadius: '6px', padding: '0.2rem 0.65rem' }}>
              Period: {report?.from} – {report?.to}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Total Bookings */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #e8e0d0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#faf6ee',
                  border: '1px solid #dfd5c4',
                  color: 'var(--bistro-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600, display: 'block' }}>
                  Total Bookings
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--bistro-ink)', lineHeight: 1.15 }}>
                  {summary.totalReservations}
                </div>
              </div>
            </div>

            {/* Confirmed */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #bfe3c3',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#eef7ee',
                  border: '1px solid #bfe3c3',
                  color: '#1b6927',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', fontWeight: 600, display: 'block' }}>
                  Confirmed
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#1b6927', lineHeight: 1.15 }}>
                  {summary.confirmedReservations}
                </div>
              </div>
            </div>

            {/* Pending */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #f9dfb6',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#fdf6ea',
                  border: '1px solid #f9dfb6',
                  color: '#b25e00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b25e00', fontWeight: 600, display: 'block' }}>
                  Pending
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#b25e00', lineHeight: 1.15 }}>
                  {summary.pendingReservations}
                </div>
              </div>
            </div>

            {/* Completed */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #d5dceb',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#f4f6fa',
                  border: '1px solid #d5dceb',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e40af', fontWeight: 600, display: 'block' }}>
                  Completed
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#1e40af', lineHeight: 1.15 }}>
                  {summary.completedReservations}
                </div>
              </div>
            </div>

            {/* Cancelled */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#991b1b', fontWeight: 600, display: 'block' }}>
                  Cancelled
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#991b1b', lineHeight: 1.15 }}>
                  {summary.cancelledReservations}
                </div>
              </div>
            </div>

            {/* Cancellation Rate */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #e8e0d0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: summary.cancellationRate > 20 ? '#fef2f2' : '#faf6ee',
                  border: summary.cancellationRate > 20 ? '1px solid #fecaca' : '1px solid #dfd5c4',
                  color: summary.cancellationRate > 20 ? '#991b1b' : 'var(--bistro-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600, display: 'block' }}>
                  Cancellation Rate
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: summary.cancellationRate > 20 ? '#991b1b' : 'var(--bistro-ink)', lineHeight: 1.15 }}>
                  {summary.cancellationRate}%
                </div>
              </div>
            </div>

            {/* Avg Party Size */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #e8e0d0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#faf4eb',
                  border: '1px solid #e2d1ba',
                  color: 'var(--bistro-bronze)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600, display: 'block' }}>
                  Avg Party Size
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--bistro-bronze)', lineHeight: 1.15 }}>
                  {summary.averagePartySize} <span style={{ fontSize: '0.88rem', fontFamily: 'Poppins, sans-serif', color: 'var(--bistro-muted)', fontWeight: 400 }}>guests</span>
                </div>
              </div>
            </div>

            {/* Top Requested Table */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.35rem',
                border: '1px solid #e8e0d0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#faf6ee',
                  border: '1px solid #dfd5c4',
                  color: 'var(--bistro-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3" />
                  <path d="M20 18v3" />
                  <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600, display: 'block' }}>
                  Top Table
                </span>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--bistro-bronze)', lineHeight: 1.15 }}>
                  {summary.mostRequestedTableNumber || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && !error && summary && !hasData && (
        <div className="availability-state" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: '2.5rem', background: '#faf8f4', border: '1px solid #e8e0d0', borderRadius: '12px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--bistro-ink)', margin: 0 }}>
            No reservations found for the period {report?.from} to {report?.to}.
          </p>
          <p style={{ color: '#7c7267', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Try broadening the date range or selecting a different window.
          </p>
        </div>
      )}

      {/* Charts & Visualizations */}
      {hasData && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {/* Daily Trend Chart */}
          <div
            className="bistro-card"
            style={{
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #e8e0d0',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
            }}
          >
            {/* Top Gold Accent Strip */}
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
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--bistro-ink)' }}>
              Daily Bookings Breakdown
            </h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={bookingsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3efe8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill={STATUS_COLORS.Confirmed} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill={STATUS_COLORS.Pending} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill={STATUS_COLORS.Completed} />
                  <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={STATUS_COLORS.Cancelled} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie Chart */}
          <div
            className="bistro-card"
            style={{
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #e8e0d0',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
            }}
          >
            {/* Top Gold Accent Strip */}
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
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--bistro-ink)' }}>
              Reservation Status Distribution
            </h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistributionData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} reservations`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Accessible Data Tables */}
      {report && (
        <>
          {/* Bookings Per Day Accessible Table */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div
              className="bistro-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #e8e0d0',
                borderRadius: '14px',
                boxShadow: '0 6px 20px rgba(40, 30, 15, 0.05)',
              }}
            >
              {/* Top Gold Accent Strip */}
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
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #eee5d7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                }}
              >
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--bistro-ink)', margin: 0 }}>
                  Daily Bookings Data
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
                  {bookingsPerDay.length} Days Recorded
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f5efe6', borderBottom: '1px solid #dfd8cb' }}>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Date</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Total</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Confirmed</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Pending</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Completed</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsPerDay.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#7c7267' }}>
                          No daily booking records found.
                        </td>
                      </tr>
                    ) : (
                      bookingsPerDay.map((row) => (
                        <tr
                          key={row.date}
                          style={{ borderBottom: '1px solid #eee5d7', transition: 'background-color 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 600, color: 'var(--bistro-ink)' }}>{row.date}</td>
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 700, fontFamily: 'Georgia, serif' }}>{row.total}</td>
                          <td style={{ padding: '0.9rem 1.35rem', color: '#166534', fontWeight: 600 }}>{row.confirmed}</td>
                          <td style={{ padding: '0.9rem 1.35rem', color: '#92400e', fontWeight: 600 }}>{row.pending}</td>
                          <td style={{ padding: '0.9rem 1.35rem', color: '#1e40af', fontWeight: 600 }}>{row.completed}</td>
                          <td style={{ padding: '0.9rem 1.35rem', color: '#991b1b', fontWeight: 600 }}>{row.cancelled}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Table Reservation Share Section & Accessible Table */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div
              className="bistro-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #e8e0d0',
                borderRadius: '14px',
                boxShadow: '0 6px 20px rgba(40, 30, 15, 0.05)',
              }}
            >
              {/* Top Gold Accent Strip */}
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
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #eee5d7',
                  background: '#ffffff',
                }}
              >
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--bistro-ink)', margin: '0 0 0.35rem 0' }}>
                  Table Reservation Share
                </h2>
                <p style={{ color: '#7c7267', fontSize: '0.86rem', margin: 0 }}>
                  Share percentage of all active bookings (Pending, Confirmed, Completed) across available dining tables.
                </p>
              </div>

              {tableShare.length > 0 && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee5d7', background: '#faf8f4' }}>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--bistro-ink)' }}>
                    Share Distribution (%)
                  </h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={tableShare} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8dec8" />
                        <XAxis dataKey="tableNumber" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Reservation Share']} />
                        <Bar dataKey="tableReservationShare" name="Reservation Share" fill={TABLE_BAR_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f5efe6', borderBottom: '1px solid #dfd8cb' }}>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Table</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Capacity</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Total Bookings</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Active Bookings</th>
                      <th style={{ padding: '0.9rem 1.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableShare.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#7c7267' }}>
                          No table reservation records found.
                        </td>
                      </tr>
                    ) : (
                      tableShare.map((row) => (
                        <tr
                          key={row.tableId}
                          style={{ borderBottom: '1px solid #eee5d7', transition: 'background-color 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 700, color: 'var(--bistro-ink)', fontFamily: 'Georgia, serif' }}>
                            Table {row.tableNumber}
                          </td>
                          <td style={{ padding: '0.9rem 1.35rem', color: '#4b5563' }}>{row.capacity} seats</td>
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 600 }}>{row.reservationCount}</td>
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 600 }}>{row.nonCancelledReservationCount}</td>
                          <td style={{ padding: '0.9rem 1.35rem', fontWeight: 700, color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '0.96rem' }}>
                            {row.tableReservationShare}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
