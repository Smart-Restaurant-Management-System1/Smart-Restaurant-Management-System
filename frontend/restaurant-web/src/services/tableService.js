import axios from 'axios';

const RESERVATION_API_BASE =
  import.meta.env.VITE_RESERVATION_API_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(':5001', ':5002')
    : 'http://localhost:5002/api');

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
 * Retrieves a single table by ID.
 * @param {number} id - Table ID.
 * @returns {Promise<Object>} Table object.
 */
export const getTableById = async (id) => {
  const response = await reservationApi.get(`/tables/${id}`);
  return response.data;
};

export default {
  createTable,
  getTables,
  getTableById,
};
