/**
 * Cinnamon Bistro - Order Tracking & History View Helpers
 * Pure utility functions for order tracking metrics, normalization, and status pipelines.
 */

export const STATUS_STEPS = [
  { id: 'Pending', label: 'Order Received', desc: 'Sent to the kitchen' },
  { id: 'Preparing', label: 'In Kitchen', desc: 'Chefs are preparing' },
  { id: 'Ready', label: 'Plated & Ready', desc: 'Ready for service' },
  { id: 'Served', label: 'Served', desc: 'Delivered to table' },
];

export const normalizeStatus = (status) => {
  if (status === 'Received' || status === 'Confirmed') return 'Pending';
  if (status === 'Completed') return 'Served';
  return status || 'Pending';
};

export const formatOrderCurrency = (amount) => {
  const numeric = Number(amount ?? 0);
  return `Rs. ${numeric.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatOrderDateTime = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const calculateOrderMetrics = (orders = []) => {
  if (!Array.isArray(orders)) {
    return {
      activeKitchen: 0,
      ready: 0,
      served: 0,
      totalOrders: 0,
      totalSpend: 0,
    };
  }

  let pending = 0;
  let preparing = 0;
  let ready = 0;
  let served = 0;
  let totalSpend = 0;

  orders.forEach((o) => {
    const s = normalizeStatus(o?.status);
    if (s === 'Pending') pending++;
    else if (s === 'Preparing') preparing++;
    else if (s === 'Ready') ready++;
    else if (s === 'Served') served++;
    totalSpend += Number(o?.totalAmount || 0);
  });

  return {
    activeKitchen: pending + preparing,
    ready,
    served,
    totalOrders: orders.length,
    totalSpend,
  };
};

export const filterOrders = (orders = [], { status, type } = {}) => {
  if (!Array.isArray(orders)) return [];

  return orders.filter((order) => {
    if (status && normalizeStatus(order?.status) !== status) {
      return false;
    }
    if (type && order?.orderType !== type) {
      return false;
    }
    return true;
  });
};
