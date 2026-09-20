import axios from 'axios';

const ORDER_API_BASE =
  import.meta.env.VITE_ORDER_API_URL ||
  import.meta.env.VITE_RESERVATION_API_URL ||
  'http://localhost:5000/api';

const orderApi = axios.create({
  baseURL: ORDER_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

orderApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const submitDineInOrder = async (request) => {
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const response = await orderApi.post('/orders/dine-in', request, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });

  return response.data;
};

export const submitReservationPreOrder = async (
  reservationId,
  items,
  idempotencyKey
) => {
  const response = await orderApi.post(
    '/orders/reservation-pre-order',
    {
      reservationId,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    }
  );

  return response.data;
};

export const getMyOrders = async (params = {}) => {
  const response = await orderApi.get('/orders/my-orders', {
    params,
  });

  return response.data;
};

export const getKitchenQueue = async () => {
  const response = await orderApi.get('/kitchen/queue');

  return response.data;
};
