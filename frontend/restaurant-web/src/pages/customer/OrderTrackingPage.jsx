import React, { useCallback, useEffect, useState } from 'react';
import { getMyOrders } from '../../services/orderService';

const STATUS_STEPS = ['Pending', 'Preparing', 'Ready', 'Served'];

const normalizeStatus = (status) => {
  if (status === 'Received' || status === 'Confirmed') return 'Pending';
  if (status === 'Completed') return 'Served';
  return status || 'Pending';
};

const statusClass = (status) =>
  `order-status order-status-${status.toLowerCase()}`;

function OrderCard({ order }) {
  const status = normalizeStatus(order.status);
  const currentStep = STATUS_STEPS.indexOf(status);

  return (
    <article className="order-history-card">
      <div className="order-history-header">
        <div>
          <h3>{order.orderReference || `Order #${order.orderId}`}</h3>
          <p>
            {order.orderType === 'ReservationPreOrder'
              ? 'Reservation Pre-Order'
              : 'Dine-In Order'}
          </p>
        </div>

        <span className={statusClass(status)}>{status}</span>
      </div>

      <div className="order-history-details">
        <span>
          <strong>Order ID:</strong> {order.orderId}
        </span>

        {order.tableId && (
          <span>
            <strong>Table:</strong> {order.tableId}
          </span>
        )}

        {order.reservationId && (
          <span>
            <strong>Reservation:</strong> {order.reservationId}
          </span>
        )}

        <span>
          <strong>Date:</strong>{' '}
          {order.createdAt
            ? new Date(order.createdAt).toLocaleString()
            : 'N/A'}
        </span>

        <span>
          <strong>Total:</strong> Rs.{' '}
          {Number(order.totalAmount || 0).toFixed(2)}
        </span>
      </div>

      <div className="order-timeline">
        {STATUS_STEPS.map((step, index) => (
          <div
            key={step}
            className={`timeline-step ${
              currentStep >= index ? 'completed' : ''
            } ${status === step ? 'current' : ''}`}
          >
            <div className="timeline-dot" />
            <span>{step}</span>
          </div>
        ))}
      </div>

      {Array.isArray(order.items) && order.items.length > 0 && (
        <div className="order-items">
          <h4>Items</h4>

          {order.items.map((item, index) => (
            <div
              className="order-item-row"
              key={item.orderItemId || `${item.menuItemId}-${index}`}
            >
              <span>
                {item.itemName || `Menu Item #${item.menuItemId}`}
              </span>

              <span>
                {item.quantity} × Rs.{' '}
                {Number(item.unitPrice || 0).toFixed(2)}
              </span>
            </div>
          ))}
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

      setOrders(response?.orders || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your orders. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, type]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <main className="order-tracking-page">
      <div className="page-heading">
        <h1>My Orders</h1>
        <p>Track your current orders and view your order history.</p>
      </div>

      <div className="order-filters">
        <select
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

        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All Order Types</option>
          <option value="DineIn">Dine-In</option>
          <option value="ReservationPreOrder">Reservation Pre-Order</option>
        </select>

        <button type="button" onClick={loadOrders}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading orders...</p>}

      {!loading && error && (
        <div className="order-error">
          <p>{error}</p>
          <button type="button" onClick={loadOrders}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="order-empty">
          <h3>No orders found</h3>
          <p>Your order history will appear here.</p>
        </div>
      )}

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

      <div className="order-pagination">
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>

        <span>Page {page}</span>

        <button
          type="button"
          disabled={loading || orders.length < pageSize}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
