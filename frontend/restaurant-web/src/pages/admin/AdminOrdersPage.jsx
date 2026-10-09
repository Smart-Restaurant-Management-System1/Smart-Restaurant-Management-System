import React, { useEffect, useState } from 'react';
import { getAdminOrders, exportAdminOrders } from '../../services/adminOrderService';
import PageHeader from '../../components/common/PageHeader';

const initialFilters = {
  orderReference: '',
  orderType: '',
  status: '',
  customer: '',
  tableNumber: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 20,
};

export default function AdminOrdersPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const load = async (next = filters) => {
    setData(null);
    setError('');
    try {
      const result = await getAdminOrders(next);
      setData(result);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          (e?.response?.status === 403
            ? 'You are not authorised to view administrative orders.'
            : 'Unable to load orders. Please try again.')
      );
    }
  };

  useEffect(() => {
    load(filters);
  }, [filters.page]);

  const submit = (event) => {
    event.preventDefault();

    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        setError('From date must not be later than To date.');
        return;
      }
      const diffDays = Math.ceil(
        (new Date(filters.dateTo) - new Date(filters.dateFrom)) /
          (1000 * 60 * 60 * 24)
      );
      if (diffDays > 90) {
        setError('Date range cannot exceed 90 days.');
        return;
      }
    }

    setError('');
    setFilters({ ...filters, page: 1 });
    load({ ...filters, page: 1 });
  };

  const handleExportCsv = async () => {
    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        setError('From date must not be later than To date.');
        return;
      }
      const diffDays = Math.ceil(
        (new Date(filters.dateTo) - new Date(filters.dateFrom)) /
          (1000 * 60 * 60 * 24)
      );
      if (diffDays > 90) {
        setError('Date range cannot exceed 90 days.');
        return;
      }
    }

    setIsExporting(true);
    setError('');
    try {
      const blob = await exportAdminOrders(filters);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: 'text/csv;charset=utf-8;' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to export orders. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Summary KPI Calculations
  const totalLoaded = data?.totalCount ?? (data?.items?.length || 0);
  const dineInCount =
    data?.items?.filter((i) => i.orderType === 'DineIn').length || 0;
  const preOrderCount =
    data?.items?.filter((i) => i.orderType === 'ReservationPreOrder').length ||
    0;
  const totalValue =
    data?.items?.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0) ||
    0;

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'received':
        return { background: '#fdf6ea', color: '#b25e00', border: '1px solid #f9dfb6' };
      case 'inpreparation':
        return { background: '#eef3fb', color: '#2563eb', border: '1px solid #bfdbfe' };
      case 'ready':
      case 'served':
      case 'completed':
        return { background: '#eef7ee', color: '#16a34a', border: '1px solid #bbf7d0' };
      case 'cancelled':
        return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      default:
        return { background: '#f4f6fa', color: '#475569', border: '1px solid #cbd5e1' };
    }
  };

  return (
    <div className="admin-orders-page-content" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <PageHeader
        eyebrow="Operations Management"
        title={<>Order <em>Management & Search</em></>}
        subtitle="Search, filter, and audit dine-in tickets and reservation pre-orders across all dining tables."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Total Orders Badge */}
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
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600 }}>Total</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: 'var(--bistro-ink)' }}>{totalLoaded}</strong>
            </div>

            {/* Dine-in Badge */}
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
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b25e00', fontWeight: 600 }}>Dine-In</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#b25e00' }}>{dineInCount}</strong>
            </div>

            {/* Pre-Orders Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                background: '#eef3fb',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(40, 30, 15, 0.04)',
              }}
            >
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', fontWeight: 600 }}>Pre-Orders</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1d4ed8' }}>{preOrderCount}</strong>
            </div>

            {/* Page Revenue Badge */}
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
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', fontWeight: 600 }}>Page Volume</span>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1b6927' }}>
                LKR {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        }
      />

      {/* Filter Form Card */}
      <form
        className="admin-order-filters bistro-card"
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
          {/* Order Reference */}
          <div style={{ flex: '1 1 125px', minWidth: '115px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
              Reference
            </label>
            <input
              placeholder="e.g. DIN-000001"
              value={filters.orderReference}
              onChange={(e) => setFilters({ ...filters, orderReference: e.target.value })}
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

          {/* Order Type */}
          <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
              Order Type
            </label>
            <select
              value={filters.orderType}
              onChange={(e) => setFilters({ ...filters, orderType: e.target.value })}
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
              <option value="">All Types</option>
              <option value="DineIn">Dine-In</option>
              <option value="ReservationPreOrder">Pre-Order</option>
            </select>
          </div>

          {/* Status */}
          <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
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
              <option value="Received">Received</option>
              <option value="InPreparation">In Preparation</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ flex: '0.8 1 90px', minWidth: '80px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
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

          {/* Customer */}
          <div style={{ flex: '1.2 1 135px', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
              Customer
            </label>
            <input
              placeholder="Name, email or ID"
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
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

          {/* From Date */}
          <div style={{ flex: '1 1 120px', minWidth: '115px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
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
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 600, marginBottom: '0.35rem' }}>
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
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

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, paddingBottom: '1px', flexWrap: 'wrap' }}>
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
            <button
              className="bistro-button-outline"
              type="button"
              disabled={isExporting}
              onClick={handleExportCsv}
              style={{
                padding: '0.54rem 1rem',
                fontSize: '0.86rem',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.7 : 1,
              }}
              title="Export matching orders to CSV"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fff8f8',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {!data && !error && (
        <div
          role="status"
          style={{
            background: '#ffffff',
            border: '1px dashed #d9d0bf',
            borderRadius: '10px',
            color: 'var(--bistro-muted)',
            textAlign: 'center',
            padding: '2.5rem',
            marginBottom: '1.5rem',
          }}
        >
          Loading orders…
        </div>
      )}

      {data?.items?.length === 0 && (
        <div
          className="bistro-card"
          style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--bistro-muted)' }}
        >
          No orders match these criteria. Try adjusting your search filters.
        </div>
      )}

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
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #eee5d7',
              background: '#ffffff',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.28rem', fontWeight: 700, color: 'var(--bistro-ink)', margin: 0 }}>
                Orders Roster
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
                {data.totalCount} {data.totalCount === 1 ? 'Order' : 'Orders'} · Page {data.page} of {data.totalPages}
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
              title="Refresh orders list"
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
                    Type
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Table
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Customer
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Amount (LKR)
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Payment
                  </th>
                  <th style={{ padding: '0.95rem 1.35rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                    Created Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const badge = getStatusBadgeStyle(item.status);
                  return (
                    <tr
                      key={`${item.orderType}-${item.orderId}`}
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
                            padding: '0.25rem 0.65rem',
                            background: '#faf6ee',
                            border: '1px solid #e2d1ba',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--bistro-bronze)',
                            fontSize: '0.88rem',
                          }}
                        >
                          {item.orderReference}
                        </span>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: item.orderType === 'DineIn' ? '#fdf6ea' : '#eef3fb',
                            color: item.orderType === 'DineIn' ? '#b25e00' : '#2563eb',
                            border: `1px solid ${item.orderType === 'DineIn' ? '#f9dfb6' : '#bfdbfe'}`,
                          }}
                        >
                          {item.orderType === 'DineIn' ? 'Dine-In' : 'Pre-Order'}
                        </span>
                      </td>

                      {/* Table */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <strong style={{ fontFamily: 'Georgia, serif', color: 'var(--bistro-ink)', fontSize: '0.92rem' }}>
                          Table {item.tableNumber || item.tableId}
                        </strong>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#faf4eb',
                              border: '1px solid #e8dec8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#8c6736',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(item.customerName || 'C')[0]?.toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
                              {item.customerName || `Customer #${item.customerId}`}
                            </span>
                            {(item.customerEmail || item.customerPhone) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>
                                {[item.customerEmail, item.customerPhone].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            ...badge,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <strong style={{ fontFamily: 'Georgia, serif', color: 'var(--bistro-ink)', fontSize: '0.96rem' }}>
                          {Number(item.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </td>

                      {/* Payment */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: item.paymentStatus === 'Paid' ? '#eef7ee' : '#fffbeb',
                              color: item.paymentStatus === 'Paid' ? '#16a34a' : '#b45309',
                              border: `1px solid ${item.paymentStatus === 'Paid' ? '#bbf7d0' : '#fde68a'}`,
                              width: 'fit-content',
                            }}
                          >
                            {item.paymentStatus}
                          </span>
                          {item.paymentMethod && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
                              via {item.paymentMethod}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '1rem 1.35rem', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '0.84rem', color: 'var(--bistro-muted)' }}>
                        {new Date(item.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderTop: '1px solid #eee5d7',
                background: '#faf8f4',
              }}
            >
              <button
                type="button"
                className="bistro-button-outline"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.84rem',
                  opacity: filters.page <= 1 ? 0.5 : 1,
                  cursor: filters.page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--bistro-muted)', fontWeight: 600 }}>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                className="bistro-button-outline"
                disabled={filters.page >= data.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.84rem',
                  opacity: filters.page >= data.totalPages ? 0.5 : 1,
                  cursor: filters.page >= data.totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
