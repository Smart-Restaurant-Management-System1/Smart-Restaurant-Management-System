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
 * Update feedback as a customer (SR-219).
 * @param {number} id
 * @param {Object} payload - { rating, comment }
 */
export const updateFeedback = async (id, payload) => {
  const response = await feedbackApi.put(`/feedback/${id}`, payload);
  return response.data;
};

/**
 * Delete feedback as a customer (SR-219).
 * @param {number} id
 */
export const deleteFeedback = async (id) => {
  await feedbackApi.delete(`/feedback/${id}`);
};

/**
 * Admin: retrieve aggregate metrics and rating distribution.
 */
export const getAdminFeedbackSummary = async () => {
  const response = await feedbackApi.get('/feedback/admin/summary');
  return response.data;
};

/**
 * Admin: delete feedback (SR-219).
 * @param {number} id
 */
export const adminDeleteFeedback = async (id) => {
  await feedbackApi.delete(`/feedback/admin/${id}`);
};

/**
 * Admin: mark feedback as read or unread (SR-219).
 * @param {number} id
 * @param {boolean} isRead
 */
export const adminMarkAsRead = async (id, isRead = true) => {
  const response = await feedbackApi.patch(`/feedback/admin/${id}/read`, { isRead });
  return response.data;
};

/**
 * Admin: reply to customer feedback (SR-219).
 * @param {number} id
 * @param {string} reply
 */
export const adminReplyFeedback = async (id, reply) => {
  const response = await feedbackApi.post(`/feedback/admin/${id}/reply`, { reply });
  return response.data;
};
