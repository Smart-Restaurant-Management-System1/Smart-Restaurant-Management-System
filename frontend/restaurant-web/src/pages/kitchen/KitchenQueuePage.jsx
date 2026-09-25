
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getKitchenQueue, updateKitchenOrderStatus } from '../../services/orderService';

const REFRESH_INTERVAL = 10000;

const COLORS = {
  background: '#f7f3eb',
  paper: '#ffffff',
  cream: '#f5ede1',
  dark: '#2d251f',
  brown: '#493628',
  gold: '#a87942',
  border: '#e4d8c8',
  muted: '#8b7967',
  pending: '#bd8133',
  preparing: '#9b6e4d',
  ready: '#64804f',
};

const STATUS_CONFIG = {
  Pending: {
    label: 'Pending',
    color: COLORS.pending,
    background: '#fbf0dc',
    border: '#ead1a5',
    description: 'Waiting to be prepared',
  },
  Preparing: {
    label: 'Preparing',
    color: COLORS.preparing,
    background: '#f3e7dd',
    border: '#dfc7b4',
    description: 'Currently being prepared',
  },
  Ready: {
    label: 'Ready',
    color: COLORS.ready,
    background: '#e8f1e4',
    border: '#c6ddbd',
    description: 'Ready to serve',
  },
};

const formatTime = (dateValue) => {
  if (!dateValue) return 'Unknown time';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return 'Unknown date';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatCurrency = (amount) => {
  const numericAmount = Number(amount ?? 0);

  return `Rs. ${numericAmount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getOrderTypeLabel = (orderType) => {
  return orderType === 'ReservationPreOrder'
    ? 'Reservation Pre-Order'
    : 'Dine-in Order';
};

const getOrderTypeShortLabel = (orderType) => {
  return orderType === 'ReservationPreOrder'
    ? 'Pre-Order'
    : 'Dine-in';
};

/* =========================================================
   SMALL UI COMPONENTS
   ========================================================= */

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '7px 12px',
        borderRadius: '999px',
        border: `1px solid ${config.border}`,
        background: config.background,
        color: config.color,
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: config.color,
        }}
      />

      {config.label}
    </span>
  );
}

function SummaryCard({
  label,
  count,
  description,
  accentColor,
  icon,
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        minWidth: 0,
        minHeight: '142px',
        padding: '24px',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '14px',
        background: COLORS.paper,
        boxShadow: '0 5px 18px rgba(62, 43, 27, 0.045)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${accentColor} 0%, #ecd6aa 50%, ${accentColor} 100%)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          flex: '0 0 52px',
          border: `1px solid ${accentColor}45`,
          borderRadius: '12px',
          background: `${accentColor}12`,
          color: accentColor,
          fontSize: '24px',
          fontWeight: 700,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 9px',
            color: COLORS.muted,
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            lineHeight: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '9px',
          }}
        >
          <strong
            style={{
              color: COLORS.dark,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '35px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {count}
          </strong>
        </div>

        <p
          style={{
            margin: '9px 0 0',
            color: '#9b8977',
            fontSize: '12px',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: '#a08d79',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: COLORS.brown,
          fontSize: '12px',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   ORDER TICKET
   ========================================================= */

const actionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '38px',
  padding: '0 12px',
  border: '1px solid transparent',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function QueueOrderCard({ order, onStatusUpdate, updatingOrder }) {
  const statusConfig =
    STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '13px',
        background: COLORS.paper,
        boxShadow: '0 4px 16px rgba(62, 43, 27, 0.045)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-3px)';
        event.currentTarget.style.boxShadow =
          '0 10px 26px rgba(62, 43, 27, 0.11)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow =
          '0 4px 16px rgba(62, 43, 27, 0.045)';
      }}
    >
      {/* Ticket top accent */}
      <div
        style={{
          height: '4px',
          flexShrink: 0,
          background: `linear-gradient(90deg, ${statusConfig.color} 0%, #ecd6aa 50%, ${statusConfig.color} 100%)`,
        }}
      />

      {/* Ticket header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '19px 20px 16px',
          borderBottom: `1px dashed ${COLORS.border}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              marginBottom: '7px',
              color: COLORS.dark,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {order.orderReference || 'Unknown Order'}
          </div>

          <div
            style={{
              color: COLORS.gold,
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            {getOrderTypeLabel(order.orderType)}
          </div>
        </div>

        <StatusBadge status={order.status} />
      </div>

      {/* Ticket information */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '15px',
          padding: '16px 20px',
          background: '#fcf8f2',
          borderBottom: `1px solid #eee5da`,
        }}
      >
        <MetaItem
          label="Received"
          value={formatTime(order.submittedAt)}
        />

        <MetaItem
          label="Order Type"
          value={getOrderTypeShortLabel(order.orderType)}
        />

        {order.tableId && (
          <MetaItem
            label="Table"
            value={order.tableId}
          />
        )}

        {order.reservationId && (
          <MetaItem
            label="Reservation"
            value={order.reservationId}
          />
        )}
      </div>

      {/* Order items */}
      <div
        style={{
          flex: 1,
          padding: '19px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <h4
            style={{
              margin: 0,
              color: '#78634f',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            Order Items
          </h4>

          <span
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: COLORS.cream,
              color: COLORS.gold,
              fontSize: '10px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {order.items?.length || 0}{' '}
            {order.items?.length === 1 ? 'ITEM' : 'ITEMS'}
          </span>
        </div>

        {order.items?.length > 0 ? (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {order.items.map((item, index) => (
              <li
                key={`${order.orderReference}-${item.orderItemId || index}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom:
                    index === order.items.length - 1
                      ? 'none'
                      : '1px solid #f0e9df',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '9px',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '25px',
                      height: '25px',
                      padding: '0 5px',
                      borderRadius: '6px',
                      background: '#f0e4d3',
                      color: '#805d36',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {item.quantity}
                  </span>

                  <span
                    style={{
                      color: '#514238',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: 1.5,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.itemName}
                  </span>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    color: '#806b55',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCurrency(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              margin: 0,
              color: '#9b8977',
              fontSize: '12px',
            }}
          >
            No item details available.
          </p>
        )}
      </div>

      {/* Ticket footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          background: '#fbf6ee',
          borderTop: `1px dashed ${COLORS.border}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              marginBottom: '4px',
              color: '#a08d79',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Order Total
          </div>

          <span
            style={{
              color: COLORS.dark,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '19px',
              fontWeight: 700,
            }}
          >
            {formatCurrency(order.totalAmount)}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '10px',
          }}
        >
          {order.status === 'Pending' && (
            <button
              type="button"
              style={{
                ...actionButtonStyle,
                minHeight: '38px',
                padding: '0 12px',
                background: COLORS.preparing,
                borderColor: COLORS.preparing,
                color: '#ffffff',
              }}
              disabled={updatingOrder === order.orderReference}
              onClick={() => onStatusUpdate(order.orderReference, 'Preparing')}
            >
              {updatingOrder === order.orderReference ? 'Updating...' : 'Start Preparing'}
            </button>
          )}

          {order.status === 'Preparing' && (
            <button
              type="button"
              style={{
                ...actionButtonStyle,
                minHeight: '38px',
                padding: '0 12px',
                background: COLORS.ready,
                borderColor: COLORS.ready,
                color: '#ffffff',
              }}
              disabled={updatingOrder === order.orderReference}
              onClick={() => onStatusUpdate(order.orderReference, 'Ready')}
            >
              {updatingOrder === order.orderReference ? 'Updating...' : 'Mark Ready'}
            </button>
          )}

          <div
            style={{
              color: '#998573',
              fontSize: '11px',
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTime(order.submittedAt)}
          </div>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   ORDER SECTION
   ========================================================= */

function QueueSection({
  title,
  description,
  orders,
  accentColor,
  onStatusUpdate,
  updatingOrder,
}) {
  return (
    <section style={{ width: '100%', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                margin: 0,
                color: COLORS.dark,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '25px',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '31px',
                height: '27px',
                padding: '0 9px',
                borderRadius: '999px',
                background: `${accentColor}18`,
                color: accentColor,
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {orders.length}
            </span>
          </div>

          <p
            style={{
              margin: '7px 0 0',
              color: COLORS.muted,
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {orders.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            alignItems: 'stretch',
            gap: '18px',
          }}
        >
          {orders.map((order) => (
            <QueueOrderCard
              key={order.orderReference}
              order={order}
              onStatusUpdate={onStatusUpdate}
              updatingOrder={updatingOrder}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minHeight: '105px',
            padding: '24px',
            border: `1px dashed ${COLORS.border}`,
            borderRadius: '12px',
            background: '#fcf8f2',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              flexShrink: 0,
              borderRadius: '50%',
              background: `${accentColor}16`,
              color: accentColor,
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            ✓
          </div>

          <div>
            <h3
              style={{
                margin: '0 0 4px',
                color: COLORS.brown,
                fontSize: '14px',
                fontWeight: 800,
              }}
            >
              No orders here
            </h3>

            <p
              style={{
                margin: 0,
                color: COLORS.muted,
                fontSize: '12px',
              }}
            >
              There are currently no orders in this section.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function KitchenQueuePage() {
  const [queue, setQueue] = useState([]);
  const [retrievedAt, setRetrievedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState('');

  const loadQueue = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await getKitchenQueue();

      setQueue(
        Array.isArray(response?.orders)
          ? response.orders
          : []
      );

      setRetrievedAt(
        response?.retrievedAt || new Date().toISOString()
      );
    } catch (requestError) {
      console.error(
        'Failed to load kitchen queue:',
        requestError
      );

      if (requestError?.response?.status === 401) {
        setError(
          'Your session has expired. Please sign in again.'
        );
      } else if (requestError?.response?.status === 403) {
        setError(
          'You do not have permission to access the kitchen queue.'
        );
      } else {
        setError(
          'Unable to load the kitchen queue. Please try again.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    const intervalId = window.setInterval(() => {
      loadQueue();
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadQueue]);

  const handleStatusUpdate = useCallback(async (orderReference, status) => {
    try {
      setUpdatingOrder(orderReference);
      setError('');
      await updateKitchenOrderStatus(orderReference, status);
      await loadQueue(true);
    } catch (requestError) {
      console.error('Failed to update kitchen order status:', requestError);
      setError(
        requestError?.response?.data?.message ||
          'Unable to update the order status. Please try again.'
      );
    } finally {
      setUpdatingOrder('');
    }
  }, [loadQueue]);

  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return queue.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        String(order.orderReference || '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(order.tableId || '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(order.reservationId || '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        (order.items || []).some((item) =>
          String(item.itemName || '')
            .toLowerCase()
            .includes(normalizedSearch)
        );

      const matchesType =
        orderTypeFilter === 'all' ||
        (orderTypeFilter === 'dinein' &&
          order.orderType !== 'ReservationPreOrder') ||
        (orderTypeFilter === 'preorder' &&
          order.orderType === 'ReservationPreOrder');

      const matchesStatus =
        statusFilter === 'all' ||
        order.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [queue, searchTerm, orderTypeFilter, statusFilter]);

  const groupedOrders = useMemo(() => {
    return {
      pending: filteredQueue.filter(
        (order) => order.status === 'Pending'
      ),
      preparing: filteredQueue.filter(
        (order) => order.status === 'Preparing'
      ),
      ready: filteredQueue.filter(
        (order) => order.status === 'Ready'
      ),
    };
  }, [filteredQueue]);

  const totalOrders = queue.length;

  const totalPending = queue.filter(
    (order) => order.status === 'Pending'
  ).length;

  const totalPreparing = queue.filter(
    (order) => order.status === 'Preparing'
  ).length;

  const totalReady = queue.filter(
    (order) => order.status === 'Ready'
  ).length;

  const inputStyle = {
    width: '100%',
    minHeight: '46px',
    padding: '0 13px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '9px',
    outline: 'none',
    background: '#fffdf9',
    color: COLORS.dark,
    fontFamily: 'inherit',
    fontSize: '13px',
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 18px',
    border: `1px solid ${COLORS.gold}`,
    borderRadius: '8px',
    background: COLORS.paper,
    color: COLORS.brown,
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1500px',
        minWidth: 0,
        margin: '0 auto',
        paddingBottom: '50px',
      }}
    >
      <PageHeader
        eyebrow="Operations Portal"
        title={
          <>
            Kitchen Order <em>Queue</em>
          </>
        }
        subtitle="Manage incoming orders, monitor preparation progress, and track kitchen fulfillment."
        actions={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              style={buttonStyle}
              onClick={() => loadQueue(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Queue'}
            </button>

            <Link
              to="/tables"
              style={{
                ...buttonStyle,
                textDecoration: 'none',
              }}
            >
              View Tables
            </Link>
          </div>
        }
      />

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          margin: '27px 0',
        }}
      >
        <SummaryCard
          label="Total Active Orders"
          count={totalOrders}
          description="Currently in the queue"
          accentColor="#8c6745"
          icon="▤"
        />

        <SummaryCard
          label="Pending Orders"
          count={totalPending}
          description="Waiting to start"
          accentColor={COLORS.pending}
          icon="◷"
        />

        <SummaryCard
          label="Preparing Orders"
          count={totalPreparing}
          description="Being prepared"
          accentColor={COLORS.preparing}
          icon="♨"
        />

        <SummaryCard
          label="Ready Orders"
          count={totalReady}
          description="Ready to serve"
          accentColor={COLORS.ready}
          icon="✓"
        />
      </div>

      {/* =====================================================
          MAIN QUEUE PANEL
          ===================================================== */}

      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: '15px',
          background: COLORS.paper,
          boxShadow: '0 7px 25px rgba(62, 43, 27, 0.055)',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '25px 28px',
            borderTop: `5px solid ${COLORS.gold}`,
            borderBottom: `1px solid ${COLORS.border}`,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                flexWrap: 'wrap',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: COLORS.dark,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '25px',
                  fontWeight: 700,
                }}
              >
                Kitchen Operations
              </h2>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '7px 12px',
                  border: `1px solid #e5d1b2`,
                  borderRadius: '999px',
                  background: '#f7ecdc',
                  color: COLORS.gold,
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {filteredQueue.length} Orders
              </span>
            </div>

            <p
              style={{
                margin: '7px 0 0',
                color: COLORS.muted,
                fontSize: '12px',
              }}
            >
              Monitor incoming orders and preparation progress.
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: COLORS.ready,
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COLORS.ready,
                boxShadow: `0 0 0 4px ${COLORS.ready}18`,
              }}
            />

            LIVE UPDATES
          </div>
        </div>

        {/* Search and filters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(150px, 1fr)',
            gap: '12px',
            padding: '20px 28px',
            background: '#fcf9f4',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <input
            type="search"
            placeholder="Search order, table, or item..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={inputStyle}
          />

          <select
            value={orderTypeFilter}
            onChange={(event) =>
              setOrderTypeFilter(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">All Order Types</option>
            <option value="dinein">Dine-in Orders</option>
            <option value="preorder">Reservation Pre-Orders</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
          </select>
        </div>

        {/* Queue content */}
        <div style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px',
              marginBottom: '25px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
              }}
            >
              <span
                style={{
                  width: '4px',
                  height: '22px',
                  borderRadius: '3px',
                  background: COLORS.gold,
                }}
              />

              <h3
                style={{
                  margin: 0,
                  color: COLORS.brown,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '21px',
                  fontWeight: 700,
                }}
              >
                Active Order Tickets
              </h3>
            </div>

            <span
              style={{
                color: COLORS.muted,
                fontSize: '11px',
              }}
            >
              Auto-refresh: 10 seconds
            </span>
          </div>

          {loading ? (
            <div
              style={{
                padding: '60px 20px',
                color: COLORS.muted,
                textAlign: 'center',
                fontSize: '14px',
              }}
            >
              Loading kitchen queue...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '45px 20px',
                border: '1px solid #e4c5b9',
                borderRadius: '12px',
                background: '#fff6f1',
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  margin: '0 0 10px',
                  color: '#98553e',
                  fontSize: '17px',
                }}
              >
                Unable to Load Queue
              </h3>

              <p
                style={{
                  margin: '0 0 20px',
                  color: '#a47767',
                  fontSize: '13px',
                }}
              >
                {error}
              </p>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => loadQueue(true)}
              >
                Try Again
              </button>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                border: `1px dashed ${COLORS.border}`,
                borderRadius: '12px',
                background: '#fcf8f2',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  marginBottom: '12px',
                  color: COLORS.gold,
                  fontSize: '32px',
                }}
              >
                ✓
              </div>

              <h3
                style={{
                  margin: '0 0 8px',
                  color: COLORS.brown,
                  fontSize: '17px',
                }}
              >
                No Matching Orders
              </h3>

              <p
                style={{
                  margin: 0,
                  color: COLORS.muted,
                  fontSize: '13px',
                }}
              >
                Try changing the search or filter options.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '38px',
              }}
            >
              <QueueSection
                title="Pending Orders"
                description="Orders waiting to be prepared"
                orders={groupedOrders.pending}
                accentColor={COLORS.pending}
                onStatusUpdate={handleStatusUpdate}
                updatingOrder={updatingOrder}
              />

              <QueueSection
                title="Preparing Orders"
                description="Orders currently being prepared"
                orders={groupedOrders.preparing}
                accentColor={COLORS.preparing}
                onStatusUpdate={handleStatusUpdate}
                updatingOrder={updatingOrder}
              />

              <QueueSection
                title="Ready Orders"
                description="Orders ready for collection or serving"
                orders={groupedOrders.ready}
                accentColor={COLORS.ready}
                onStatusUpdate={handleStatusUpdate}
                updatingOrder={updatingOrder}
              />
            </div>
          )}
        </div>

        {/* Panel footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            padding: '16px 28px',
            borderTop: `1px solid ${COLORS.border}`,
            background: '#fcf9f4',
            color: COLORS.muted,
            fontSize: '11px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            {retrievedAt
              ? `Last updated: ${formatDateTime(retrievedAt)}`
              : 'Waiting for update'}
          </span>

          <span>
            {refreshing
              ? 'Refreshing queue...'
              : 'Automatic updates enabled'}
          </span>
        </div>
      </div>

      {/* Responsive layout adjustments */}
      <style>
        {`
          @media (max-width: 850px) {
            .kitchen-responsive-filters {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}