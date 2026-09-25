import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getMyOrders } from '../../services/orderService';
import './orderTracking.css';

import {
  STATUS_STEPS,
  normalizeStatus,
  formatOrderCurrency,
  formatOrderDateTime,
  calculateOrderMetrics,
} from './orderTrackingHelpers';
import './orderTracking.css';

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const statusLower = normalized.toLowerCase();

  return (
    <span className={`order-status order-status-${statusLower}`}>
      <span className="order-status-dot" />
      {normalized}
    </span>
  );
}

function OrderCard({ order }) {
  const status = normalizeStatus(order.status);
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === status);
  const isPreOrder = order.orderType === 'ReservationPreOrder';

  return (
    <article className="order-history-card">
      {/* Top Gold Gradient Accent Line */}
      <div className="order-card-gold-accent" />

      {/* Card Header */}
      <header className="order-history-header">
        <div className="order-header-main">
          <div className="order-reference-badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="10" y2="8" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="6" y1="16" x2="14" y2="16" />
            </svg>
            <span>{order.orderReference || `ORD-${order.orderId}`}</span>
          </div>

          <span className="order-type-badge">
            {isPreOrder ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Reservation Pre-Order
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 3v18" />
                  <path d="M8 3v7a2 2 0 0 1-4 0V3" />
                  <path d="M6 10v11" />
                  <path d="M14 3v18" />
                  <path d="M14 3c4 2 4 6 0 8" />
                  <path d="M18 3v18" />
                </svg>
                Dine-In Order
              </>
            )}
          </span>
        </div>

        <StatusBadge status={status} />
      </header>

      {/* 4-Box Key Metadata Grid */}
      <div className="order-history-details">
        <div className="order-detail-item">
          <span className="order-detail-label">Placed On</span>
          <span className="order-detail-value">
            {formatOrderDateTime(order.createdAt)}
          </span>
        </div>

        <div className="order-detail-item">
          <span className="order-detail-label">
            {isPreOrder ? 'Reservation' : 'Dining Table'}
          </span>
          <span className="order-detail-value">
            {isPreOrder
              ? order.reservationId
                ? `Booking #${order.reservationId}`
                : 'Linked Reservation'
              : order.tableId
              ? `Table #${order.tableId}`
              : 'Dine-In Area'}
          </span>
        </div>

        <div className="order-detail-item">
          <span className="order-detail-label">System Order ID</span>
          <span className="order-detail-value">#{order.orderId}</span>
        </div>

        <div className="order-detail-item">
          <span className="order-detail-label">Total Amount</span>
          <span className="order-detail-value order-detail-value-total">
            {formatOrderCurrency(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Interactive Culinary Stepper Timeline */}
      <div className="order-timeline-wrapper">
        <div className="order-timeline-title">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Live Culinary Preparation Progress
        </div>

        <div className="order-timeline">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex > index;
            const isCurrent = currentStepIndex === index;

            return (
              <div
                key={step.id}
                className={`timeline-step ${
                  isCompleted ? 'completed' : ''
                } ${isCurrent ? 'current' : ''}`}
              >
                <div className="timeline-dot">
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <span className="timeline-step-label">{step.label}</span>
                <span className="timeline-step-desc">{step.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ordered Items Breakdown */}
      {Array.isArray(order.items) && order.items.length > 0 && (
        <div className="order-items-wrapper">
          <div className="order-items-header">
            <h4 className="order-items-title">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
              Ordered Delicacies
            </h4>

            <span className="order-items-count-badge">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="order-items-list">
            {order.items.map((item, index) => {
              const qty = Number(item.quantity ?? 1);
              const unitPrice = Number(item.unitPrice ?? 0);
              const subtotal = qty * unitPrice;

              return (
                <li
                  className="order-item-row"
                  key={item.orderItemId || `${item.menuItemId}-${index}`}
                >
                  <div className="order-item-main">
                    <span className="order-item-qty">{qty}×</span>
                    <span className="order-item-name">
                      {item.itemName || `Menu Item #${item.menuItemId}`}
                    </span>
                  </div>

                  <div className="order-item-pricing">
                    <span className="order-item-unit-price">
                      {formatOrderCurrency(unitPrice)} each
                    </span>
                    <span className="order-item-subtotal">
                      {formatOrderCurrency(subtotal)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getMyOrders({
        page,
        pageSize,
        status: status || undefined,
        type: type || undefined,
      });

      const list = Array.isArray(response)
        ? response
        : response?.orders || [];

      setOrders(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your culinary orders. Please check your network connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, type]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Compute live metrics from order list
  const metrics = useMemo(() => calculateOrderMetrics(orders), [orders]);

  const hasActiveFilters = Boolean(status || type);

  const handleClearFilters = () => {
    setStatus('');
    setType('');
    setPage(1);
  };

  return (
    <main className="order-tracking-page">
      {/* Luxury Page Header */}
      <PageHeader
        title="My Orders & Live Tracking"
        subtitle="Monitor culinary preparation progress in real-time, view order recaps, and review your dining history."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              to="/menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '42px',
                padding: '0 18px',
                border: '1px solid #eedfc9',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#493628',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(40, 33, 21, 0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 3v18" />
                <path d="M8 3v7a2 2 0 0 1-4 0V3" />
                <path d="M6 10v11" />
                <path d="M14 3v18" />
                <path d="M14 3c4 2 4 6 0 8" />
                <path d="M18 3v18" />
              </svg>
              Browse Menu
            </Link>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '42px',
                padding: '0 18px',
                border: '1px solid #a87942',
                borderRadius: '8px',
                background: '#a87942',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(168, 121, 66, 0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: loading ? 'bistro-pulse 1s infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
        }
      />

      {/* 4 Luxury KPI Metric Summary Cards */}
      <section className="order-tracking-summary" aria-label="Order Metrics">
        <div className="order-summary-card">
          <div className="order-summary-card-accent" />
          <div className="order-summary-card-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <div className="order-summary-card-content">
            <p className="order-summary-card-label">Active In Kitchen</p>
            <h3 className="order-summary-card-value">{metrics.activeKitchen}</h3>
            <p className="order-summary-card-subtext">Pending & preparing</p>
          </div>
        </div>

        <div className="order-summary-card">
          <div
            className="order-summary-card-accent"
            style={{
              background: 'linear-gradient(90deg, #15803d 0%, #86efac 100%)',
            }}
          />
          <div
            className="order-summary-card-icon"
            style={{
              background: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#15803d',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="order-summary-card-content">
            <p className="order-summary-card-label">Ready for Service</p>
            <h3 className="order-summary-card-value" style={{ color: '#15803d' }}>
              {metrics.ready}
            </h3>
            <p className="order-summary-card-subtext">Plated and waiting</p>
          </div>
        </div>

        <div className="order-summary-card">
          <div
            className="order-summary-card-accent"
            style={{
              background: 'linear-gradient(90deg, #6d28d9 0%, #c4b5fd 100%)',
            }}
          />
          <div
            className="order-summary-card-icon"
            style={{
              background: '#f5f3ff',
              borderColor: '#ddd6fe',
              color: '#6d28d9',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="order-summary-card-content">
            <p className="order-summary-card-label">Served & Completed</p>
            <h3 className="order-summary-card-value">{metrics.served}</h3>
            <p className="order-summary-card-subtext">Delivered to table</p>
          </div>
        </div>

        <div className="order-summary-card">
          <div className="order-summary-card-accent" />
          <div className="order-summary-card-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="10" y2="8" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="6" y1="16" x2="14" y2="16" />
            </svg>
          </div>
          <div className="order-summary-card-content">
            <p className="order-summary-card-label">Total Orders</p>
            <h3 className="order-summary-card-value">{metrics.totalOrders}</h3>
            <p className="order-summary-card-subtext">All recorded orders</p>
          </div>
        </div>
      </section>

      {/* Luxury Filter Toolbar */}
      <section className="order-tracking-toolbar" aria-label="Filters">
        <div className="order-filters-group">
          <div className="order-filter-wrapper">
            <label htmlFor="order-status-filter" className="order-filter-label">
              Status:
            </label>
            <select
              id="order-status-filter"
              className="order-select-luxury"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
            </select>
          </div>

          <div className="order-filter-wrapper">
            <label htmlFor="order-type-filter" className="order-filter-label">
              Type:
            </label>
            <select
              id="order-type-filter"
              className="order-select-luxury"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Order Types</option>
              <option value="DineIn">Dine-In Orders</option>
              <option value="ReservationPreOrder">Reservation Pre-Orders</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="order-filter-clear-btn"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        <div className="order-results-count">
          Showing <strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'} on this page
        </div>
      </section>

      {/* Error Banner */}
      {!loading && error && (
        <div className="order-error-banner" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #b91c1c',
              background: '#b91c1c',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="order-list">
          {[1, 2].map((i) => (
            <div key={i} className="order-skeleton-card" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="order-empty-state">
          <div className="order-empty-icon-box">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>

          <h3 className="order-empty-title">No Culinary Orders Found</h3>
          <p className="order-empty-desc">
            {hasActiveFilters
              ? 'No orders match your chosen filters. Try clearing your filters or selecting a different status.'
              : 'You have not placed any dining or reservation pre-orders yet. Explore our handcrafted boutique menu to place your first order.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {hasActiveFilters ? (
              <button
                type="button"
                className="order-filter-clear-btn"
                onClick={handleClearFilters}
              >
                Clear Selected Filters
              </button>
            ) : (
              <Link
                to="/menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #a87942 0%, #845e2a 100%)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(168, 121, 66, 0.3)',
                }}
              >
                Browse Our Menu
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <OrderCard
              key={`${order.orderType}-${order.orderId}`}
              order={order}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <nav className="order-pagination" aria-label="Pagination">
        <button
          type="button"
          className="order-page-btn"
          disabled={page === 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous
        </button>

        <span className="order-page-indicator">Page {page}</span>

        <button
          type="button"
          className="order-page-btn"
          disabled={loading || orders.length < pageSize}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>
    </main>
  );
}
