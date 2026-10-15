import axios from 'axios';
import { handleAuthResponseError } from './api.js';

const rawBase =
  import.meta.env?.VITE_RESERVATION_API_URL || 'http://localhost:5000/api';
const NOTIFICATION_API_BASE =
  rawBase.startsWith('http') && !rawBase.endsWith('/api')
    ? `${rawBase}/api`
    : rawBase;


export const notificationApi = axios.create({
  baseURL: NOTIFICATION_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

notificationApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

notificationApi.interceptors.response.use(
  (response) => response,
  handleAuthResponseError
);

/**
 * Retrieve paginated notifications for authenticated customer (SR-220 / SR-238).
 * @param {Object} params - { page, pageSize, unreadOnly }
 */
export const getNotifications = async ({ page = 1, pageSize = 10, unreadOnly = false } = {}) => {
  const response = await notificationApi.get('/notifications', {
    params: { page, pageSize, unreadOnly },
  });
  return response.data;
};

/**
 * Retrieve unread count for badge display in TopBar and Sidebar (SR-237).
 */
export const getUnreadCount = async () => {
  const response = await notificationApi.get('/notifications/unread-count');
  return response.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read (SR-241).
 * @param {number} id - Notification ID
 */
export const markNotificationAsRead = async (id) => {
  const response = await notificationApi.patch(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read for current customer (SR-241).
 */
export const markAllNotificationsAsRead = async () => {
  const response = await notificationApi.post('/notifications/mark-all-read');
  return response.data;
};
