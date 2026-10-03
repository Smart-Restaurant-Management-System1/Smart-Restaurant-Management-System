import axios from 'axios';
import { handleAuthResponseError } from './api.js';

const PAYMENT_API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_ORDER_API_URL ||
      import.meta.env?.VITE_RESERVATION_API_URL)) ||
  'http://localhost:5000/api';

const paymentApi = axios.create({
  baseURL: PAYMENT_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

paymentApi.interceptors.request.use(
  (config) => {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

paymentApi.interceptors.response.use(
  (response) => response,
  handleAuthResponseError
);

export const createPayHereCheckout = async ({ orderType, orderId }) => {
  const response = await paymentApi.post('/payments/checkout', {
    orderType,
    orderId,
  });
  return response.data;
};

export const requestCashPayment = async ({ orderType, orderId, customerNotes }) => {
  const response = await paymentApi.post('/payments/cash', {
    orderType,
    orderId,
    customerNotes: customerNotes || null,
  });
  return response.data;
};

export const submitBankTransferSlip = async (formData) => {
  const response = await paymentApi.post('/payments/bank-transfer', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getPaymentStatus = async (orderType, orderId) => {
  try {
    const response = await paymentApi.get(`/payments/order/${orderType}/${orderId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getPendingVerifications = async () => {
  const response = await paymentApi.get('/payments/pending-verifications');
  return response.data;
};

export const getPaymentHistory = async ({ status = '', limit = 100 } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (limit) params.limit = limit;
  const response = await paymentApi.get('/payments/history', { params });
  return response.data;
};

export const verifyPayment = async (paymentId, { action, notes }) => {
  const response = await paymentApi.patch(`/payments/${paymentId}/verify`, {
    action,
    notes: notes || null,
  });
  return response.data;
};

export const simulatePayHereSandboxPayment = async ({ orderType, orderId }) => {
  const response = await paymentApi.post('/payments/simulate-sandbox-success', {
    orderType,
    orderId,
  });
  return response.data;
};

export const launchPayHereHostedCheckout = (checkoutData) => {
  if (!checkoutData || !checkoutData.checkoutUrl) {
    throw new Error('Invalid checkout data.');
  }

  if (typeof document === 'undefined') {
    return;
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkoutData.checkoutUrl;
  form.target = '_blank';
  form.style.display = 'none';

  const fields = {
    merchant_id: checkoutData.merchantId,
    return_url: checkoutData.returnUrl,
    cancel_url: checkoutData.cancelUrl,
    notify_url: checkoutData.notifyUrl,
    order_id: checkoutData.merchantOrderReference,
    items: `${checkoutData.orderType} Order #${checkoutData.orderId}`,
    currency: checkoutData.currency,
    amount: Number(checkoutData.amount).toFixed(2),
    first_name: checkoutData.customerFirstName || 'Valued',
    last_name: checkoutData.customerLastName || 'Guest',
    email: checkoutData.customerEmail || 'guest@cinnamonbistro.com',
    phone: checkoutData.customerPhone || '0771234567',
    address: 'Cinnamon Bistro',
    city: 'Colombo',
    country: 'Sri Lanka',
    hash: checkoutData.hash,
  };

  Object.entries(fields).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => {
    try {
      if (typeof document !== 'undefined' && document?.body && document.body.contains?.(form)) {
        document.body.removeChild(form);
      }
    } catch (_) {}
  }, 1000);
};

export default {
  createPayHereCheckout,
  requestCashPayment,
  submitBankTransferSlip,
  getPaymentStatus,
  getPendingVerifications,
  verifyPayment,
  launchPayHereHostedCheckout,
  simulatePayHereSandboxPayment,
};
