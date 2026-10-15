import { reservationApi } from './tableService.js';

/**
 * Validates a dashboard date range filter.
 * Ensures from is not greater than to, and difference is at most 90 days.
 * @param {string} from - 'YYYY-MM-DD'
 * @param {string} to - 'YYYY-MM-DD'
 * @returns {string|null} Error message or null if valid.
 */
export const validateDashboardDateRange = (from, to) => {
  if (!from || !to) return null;
  if (from > to) {
    return 'From date must not be later than To date.';
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
 * Returns date range bounds for standard quick presets based on local time.
 * @param {'today'|'last7'|'last30'} preset
 * @returns {{ from: string, to: string }}
 */
export const getDatePreset = (preset = 'last7') => {
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
 * Retrieves the comprehensive operational dashboard overview (SR-221 / SR-245).
 * Single composite request aggregating customer/staff metrics, reservation stats,
 * kitchen/order pipeline, menu availability, and daily trends.
 * @param {{ from?: string, to?: string }} params
 * @returns {Promise<Object>} Dashboard overview response data
 */
export const getDashboardOverview = async ({ from, to } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await reservationApi.get('/admin/dashboard/overview', { params });
  return response.data;
};

/**
 * Retrieves reservation metrics and daily trend (SR-243).
 * @param {{ from?: string, to?: string }} params
 * @returns {Promise<Object>}
 */
export const getReservationsSummary = async ({ from, to } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await reservationApi.get('/admin/dashboard/reservations-summary', { params });
  return response.data;
};

/**
 * Retrieves order and kitchen metrics, menu availability and daily order trend (SR-244).
 * @param {{ from?: string, to?: string }} params
 * @returns {Promise<Object>}
 */
export const getOrdersSummary = async ({ from, to } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await reservationApi.get('/admin/dashboard/orders-summary', { params });
  return response.data;
};
