import { reservationApi } from './tableService.js';

/**
 * Validates an audit log date range filter (SR-223 / SR-253).
 * Ensures 'from' is not after 'to', and range is within 90 days.
 * @param {string} from - 'YYYY-MM-DD'
 * @param {string} to - 'YYYY-MM-DD'
 * @returns {string|null} Error string if invalid, or null.
 */
export const validateAuditDateRange = (from, to) => {
  if (!from || !to) return null;
  if (from > to) {
    return "The 'from' date cannot be after the 'to' date.";
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    return 'Date range cannot exceed 90 days.';
  }
  return null;
};

/**
 * Generates quick date preset strings in YYYY-MM-DD format.
 * @param {'today'|'last7'|'last30'} preset
 * @returns {{ from: string, to: string }}
 */
export const getAuditDatePreset = (preset = 'last7') => {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case 'today':
      break;
    case 'last30':
      from.setDate(to.getDate() - 29);
      break;
    case 'last7':
    default:
      from.setDate(to.getDate() - 6);
      break;
  }

  const format = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    from: format(from),
    to: format(to),
  };
};

/**
 * Fetches paginated administrative audit logs from the backend (SR-223 / SR-253).
 * @param {object} params - { fromDate, toDate, actionType, adminId, search, page, pageSize }
 * @returns {Promise<{ items: Array, totalCount: number, page: number, pageSize: number, totalPages: number }>}
 */
export const getAuditLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.fromDate) queryParams.append('fromDate', params.fromDate);
  if (params.toDate) queryParams.append('toDate', params.toDate);
  if (params.actionType) queryParams.append('actionType', params.actionType);
  if (params.adminId) queryParams.append('adminId', params.adminId);
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', params.page);
  if (params.pageSize) queryParams.append('pageSize', params.pageSize);

  const response = await reservationApi.get(`/admin/audit-logs?${queryParams.toString()}`);
  return response.data;
};

/**
 * Retrieves the distinct list of recorded action types for filter dropdowns.
 * @returns {Promise<string[]>}
 */
export const getAuditActionTypes = async () => {
  const response = await reservationApi.get('/admin/audit-logs/actions');
  return response.data || [];
};

/**
 * Formats a friendly label and color badge for an audit action type.
 * @param {string} actionType
 * @returns {{ label: string, color: string, bg: string, border: string }}
 */
export const formatActionType = (actionType) => {
  switch (actionType) {
    case 'USER_BLOCKED':
      return { label: 'User Blocked', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'USER_UNBLOCKED':
      return { label: 'User Unblocked', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' };
    case 'USER_DELETED':
      return { label: 'User Deactivated', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'USER_STATUS_CHANGE_DENIED':
    case 'USER_DELETE_DENIED':
      return { label: 'Action Denied', color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    case 'MENU_ITEM_CREATED':
      return { label: 'Dish Created', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    case 'MENU_ITEM_UPDATED':
      return { label: 'Dish Updated', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
    case 'MENU_AVAILABILITY_CHANGED':
      return { label: 'Availability Changed', color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff' };
    case 'MENU_ITEM_DELETED':
      return { label: 'Dish Removed', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'RESERVATION_STATUS_CHANGED':
      return { label: 'Booking Status', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
    case 'RESERVATION_RESCHEDULED':
      return { label: 'Booking Rescheduled', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' };
    case 'TABLE_CREATED':
      return { label: 'Table Added', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    case 'TABLE_UPDATED':
      return { label: 'Table Updated', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
    case 'TABLE_DELETED':
      return { label: 'Table Deactivated', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    default:
      return { label: actionType || 'Unknown Action', color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
  }
};

