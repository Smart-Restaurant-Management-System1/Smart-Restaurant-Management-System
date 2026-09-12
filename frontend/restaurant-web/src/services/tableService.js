import axios from 'axios';

const RESERVATION_API_BASE =
  import.meta.env.VITE_RESERVATION_API_URL || 'http://localhost:5000/api';

export const reservationApi = axios.create({
  baseURL: RESERVATION_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to reservation requests
reservationApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Creates a new restaurant table in the reservation system (Admin only).
 * @param {Object} tableData - { tableNumber, capacity, location, status }
 * @returns {Promise<Object>} The created table response object.
 */
export const createTable = async (tableData) => {
  const response = await reservationApi.post('/tables', tableData);
  return response.data;
};

/**
 * Retrieves all restaurant tables.
 * @param {boolean} [activeOnly] - Optional filter for active tables only.
 * @returns {Promise<Array>} Array of table objects.
 */
export const getTables = async (activeOnly = null) => {
  const params = {};
  if (activeOnly !== null) {
    params.activeOnly = activeOnly;
  }
  const response = await reservationApi.get('/tables', { params });
  return response.data;
};

/**
 * Retrieves active physical tables for customers, staff, and administrators.
 * This is inventory status only; it does not calculate reservation availability.
 * @returns {Promise<Array>} Active table objects.
 */
export const getActiveTables = async () => {
  const response = await reservationApi.get('/tables/active');
  return response.data;
};

/** Searches booking-specific availability. This does not create or lock a reservation. */
export const searchAvailableTables = async (search, signal) => {
  const response = await reservationApi.get('/reservations/availability', { params: search, signal });
  return response.data;
};

/** Creates a reservation from SR-57 search context. Customer ownership is assigned by the JWT server-side. */
export const createReservation = async (request, idempotencyKey) => {
  const response = await reservationApi.post('/reservations', request, { headers: { 'Idempotency-Key': idempotencyKey } });
  return response.data;
};

/** Retrieves the authenticated customer's paginated reservation history. */
export const getMyReservationHistory = async (page = 1, pageSize = 10) => {
  const response = await reservationApi.get('/reservations/my-history', { params: { page, pageSize } });
  return response.data;
};

/** Cancels the authenticated customer's eligible reservation. */
export const cancelMyReservation = async (reservationId) => {
  await reservationApi.post(`/reservations/${reservationId}/cancel`);
};

/**
 * Retrieves a single table by ID.
 * @param {number} id - Table ID.
 * @returns {Promise<Object>} Table object.
 */
export const getTableById = async (id) => {
  const response = await reservationApi.get(`/tables/${id}`);
  return response.data;
};

/**
 * Updates an existing table by ID (Admin only).
 * @param {number} id - Table ID.
 * @param {Object} tableData - { tableNumber, capacity, location, status }
 * @returns {Promise<Object>} Updated table response object.
 */
export const updateTable = async (id, tableData) => {
  const response = await reservationApi.put(`/tables/${id}`, tableData);
  return response.data;
};

/**
 * Deletes a table by ID (Admin only).
 * @param {number} id - Table ID.
 * @returns {Promise<void>}
 */
export const deleteTable = async (id) => {
  await reservationApi.delete(`/tables/${id}`);
};

export default {
  createTable,
  getTables,
  getTableById,
  getActiveTables,
  searchAvailableTables,
  createReservation,
  getMyReservationHistory,
  cancelMyReservation,
  updateTable,
  deleteTable,
};
