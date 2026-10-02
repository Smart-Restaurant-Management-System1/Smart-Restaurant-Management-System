import axios from 'axios';
import { handleAuthResponseError } from './api';

const RESERVATION_API_BASE =
  import.meta.env.VITE_RESERVATION_API_URL || 'http://localhost:5000/api';

export const feedbackApi = axios.create({
  baseURL: RESERVATION_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

feedbackApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

feedbackApi.interceptors.response.use(
  (response) => response,
  handleAuthResponseError
);

/**
 * Submit feedback as a customer (SR-219 / SR-234).
 * @param {Object} payload - { rating, comment, reservationId, orderId, orderType }
 */
export const submitFeedback = async (payload) => {
  const response = await feedbackApi.post('/feedback', payload);
  return response.data;
};

/**
 * Retrieve current customer's own submitted feedback.
 */
export const getMyFeedback = async () => {
  const response = await feedbackApi.get('/feedback/my');
  return response.data;
};

/**
 * Admin: retrieve paginated feedback with optional rating/date/search filters.
 * @param {Object} params - { page, pageSize, rating, fromDate, toDate, search }
 */
export const getAdminFeedback = async (params = {}) => {
  const response = await feedbackApi.get('/feedback/admin', { params });
  return response.data;
};

/**
 * Admin: retrieve feedback aggregate metrics and rating distribution.
 */
export const getAdminFeedbackSummary = async () => {
  const response = await feedbackApi.get('/feedback/admin/summary');
  return response.data;
};
