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
      <form className="availability-form admin-reservation-filters bistro-card" onSubmit={handleFilterSubmit} style={{ marginBottom: '2rem' }}>
        <div className="availability-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            From Date
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              disabled={loading}
              style={{ marginTop: '0.35rem' }}
            />
          </label>
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
            To Date
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              disabled={loading}
              style={{ marginTop: '0.35rem' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          <button className="bistro-button-gold" type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Apply Range'}
          </button>
          <button className="bistro-button-outline" type="button" onClick={handleReset} disabled={loading}>
            Reset (30 Days)
          </button>
          <button
            className="bistro-button-outline"
            type="button"
            disabled={loading || !!exporting}
            onClick={() => handleExport('csv')}
            style={{ marginLeft: 'auto' }}
          >
            {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
          </button>
          <button
            className="bistro-button-dark"
            type="button"
            disabled={loading || !!exporting}
            onClick={() => handleExport('xlsx')}
          >
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
        <div className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>
          Loading reservation report data…
        </div>
      )}

      {/* Summary Metrics Cards */}
      {summary && (
        <section aria-label="Report summary" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.45rem', marginBottom: '1.25rem' }}>Summary <em>Overview</em></h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label">Total Bookings</span>
              <div className="bistro-metric-value">{summary.totalReservations}</div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label" style={{ color: '#276732' }}>Confirmed</span>
              <div className="bistro-metric-value" style={{ color: '#276732' }}>{summary.confirmedReservations}</div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label" style={{ color: '#8c6736' }}>Pending</span>
              <div className="bistro-metric-value" style={{ color: '#8c6736' }}>{summary.pendingReservations}</div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label" style={{ color: '#28251f' }}>Completed</span>
              <div className="bistro-metric-value">{summary.completedReservations}</div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label" style={{ color: '#991b1b' }}>Cancelled</span>
              <div className="bistro-metric-value" style={{ color: '#991b1b' }}>{summary.cancelledReservations}</div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label">Cancellation Rate</span>
              <div className="bistro-metric-value" style={{ color: summary.cancellationRate > 20 ? '#991b1b' : 'var(--bistro-ink)' }}>
                {summary.cancellationRate}%
              </div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label">Avg Party Size</span>
              <div className="bistro-metric-value">
                {summary.averagePartySize} <span style={{ fontSize: '0.92rem', color: 'var(--bistro-muted)', fontFamily: 'Poppins, sans-serif' }}>guests</span>
              </div>
            </div>
            <div className="bistro-metric-card">
              <span className="bistro-metric-label">Top Requested Table</span>
              <div className="bistro-metric-value" style={{ color: 'var(--bistro-bronze)' }}>
                {summary.mostRequestedTableNumber || 'N/A'}
              </div>
            </div>
          </div>
        </section>
      )}

        {/* Empty State */}
        {!loading && !error && summary && !hasData && (
          <div className="availability-state" style={{ textAlign: 'center', padding: '3rem 1rem', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4b5563', margin: 0 }}>
              No reservations found for the period {report?.from} to {report?.to}.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Try broadening the date range or selecting a different window.
            </p>
          </div>
        )}

        {/* Charts & Visualizations */}
        {hasData && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Daily Trend Chart */}
            <div className="active-table-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>Daily Bookings Breakdown</h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={bookingsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
            <div className="active-table-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>Reservation Status Distribution</h3>
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
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#111827' }}>Daily Bookings Data</h2>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Total</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Confirmed</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pending</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Completed</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsPerDay.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                          No daily booking records.
                        </td>
                      </tr>
                    ) : (
                      bookingsPerDay.map((row) => (
                        <tr key={row.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{row.date}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.total}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#166534' }}>{row.confirmed}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#92400e' }}>{row.pending}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#1e40af' }}>{row.completed}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#991b1b' }}>{row.cancelled}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Table Reservation Share Section & Accessible Table */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#111827' }}>Table Reservation Share</h2>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Share percentage of all active bookings (Pending, Confirmed, Completed) across available dining tables.
              </p>

              {tableShare.length > 0 && (
                <div className="active-table-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>Table Reservation Share (%)</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={tableShare} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="tableNumber" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Reservation Share']} />
                        <Bar dataKey="tableReservationShare" name="Reservation Share" fill={TABLE_BAR_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Table Number</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Capacity</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Total Bookings</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Active Bookings</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableShare.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                          No table reservation data.
                        </td>
                      </tr>
                    ) : (
                      tableShare.map((row) => (
                        <tr key={row.tableId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.tableNumber}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{row.capacity} seats</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{row.reservationCount}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{row.nonCancelledReservationCount}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#b45309' }}>
                            {row.tableReservationShare}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </div>
  );
}
