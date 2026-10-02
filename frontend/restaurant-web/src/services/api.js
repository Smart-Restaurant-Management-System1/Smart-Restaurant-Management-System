import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT Bearer token to all authenticated requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper for applying consistent 401 session clearing and redirection across all axios clients
export const handleAuthResponseError = (error) => {
  if (error?.response && error.response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
};

// Response interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  handleAuthResponseError
);

export default api;
