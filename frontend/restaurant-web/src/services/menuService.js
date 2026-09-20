
import axios from 'axios';

const reservationApi = axios.create({
  baseURL:
    import.meta.env.VITE_RESERVATION_API_URL ||
    'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the logged-in user's JWT token to every request
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

// Get all menu items for admin with optional filters
export const getMenuItems = async ({
  search = '',
  category = '',
  isAvailable = '',
} = {}) => {
  const params = {};

  if (search.trim()) {
    params.search = search.trim();
  }

  if (category) {
    params.category = category;
  }

  if (isAvailable !== '') {
    params.isAvailable = isAvailable;
  }

  const response = await reservationApi.get('/MenuItems', {
    params,
  });

  return response.data;
};

// Get available menu items for customers with optional filters
export const getCustomerMenuItems = async ({
  search = '',
  category = '',
  dietaryInfo = '',
} = {}) => {
  const params = {};

  if (search.trim()) {
    params.search = search.trim();
  }

  if (category) {
    params.category = category;
  }

  if (dietaryInfo) {
    params.dietaryInfo = dietaryInfo;
  }

  const response = await reservationApi.get('/customer-menu', {
    params,
  });

  return response.data;
};

// Get one menu item
export const getMenuItemById = async (id) => {
  const response = await reservationApi.get(`/MenuItems/${id}`);

  return response.data;
};

// Create a menu item
export const createMenuItem = async (menuItem) => {
  const response = await reservationApi.post('/MenuItems', menuItem);

  return response.data;
};

// Update a menu item
export const updateMenuItem = async (id, menuItem) => {
  const response = await reservationApi.put(
    `/MenuItems/${id}`,
    menuItem
  );

  return response.data;
};

// Update menu item availability
export const updateMenuItemAvailability = async (id, isAvailable) => {
  const response = await reservationApi.patch(
    `/MenuItems/${id}/availability`,
    {
      isAvailable,
    }
  );

  return response.data;
};

// Delete a menu item
export const deleteMenuItem = async (id) => {
  const response = await reservationApi.delete(
    `/MenuItems/${id}`
  );

  return response.data;
};

// Upload menu item image file (returns imageUrl and fileName)
export const uploadMenuItemImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await reservationApi.post('/MenuItems/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Resolve image URL for both local uploads and external CDN links
export const resolveImageUrl = (imageRef) => {
  if (!imageRef || typeof imageRef !== 'string') return '';
  const trimmed = imageRef.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const apiBase =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RESERVATION_API_URL) ||
      'http://localhost:5000/api';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${trimmed}`;
  }
  return trimmed;
};

export default reservationApi;