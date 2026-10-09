import { reservationApi } from './tableService.js';

/**
 * Service for administrative order search, filtering, and CSV export (SR-247, SR-248).
 */

/**
 * Queries orders across dine-in and reservation pre-orders with multi-criteria filters and pagination.
 * @param {Object} filters - { orderReference, orderType, status, customer, tableNumber, dateFrom, dateTo, page, pageSize }
 * @returns {Promise<Object>} Paginated orders response { items, page, pageSize, totalCount, totalPages }
 */
export const getAdminOrders = async (filters = {}) => {
  const response = await reservationApi.get('/admin/orders', {
    params: filters,
  });
  return response.data;
};

/**
 * Exports matching order records to CSV format.
 * @param {Object} filters - Search filter criteria
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportAdminOrders = async (filters = {}) => {
  const response = await reservationApi.get('/admin/orders/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
