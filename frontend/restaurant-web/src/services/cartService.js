
import reservationApi from './menuService';

/**
 * Get the authenticated customer's cart.
 */
export const getCart = async () => {
  const response = await reservationApi.get('/order-cart');
  return response.data;
};

/**
 * Add an item to the authenticated customer's cart.
 */
export const addCartItem = async (menuItemId, quantity = 1) => {
  const response = await reservationApi.post('/order-cart/items', {
    menuItemId,
    quantity,
  });

  return response.data;
};

/**
 * Update the quantity of an existing cart item.
 */
export const updateCartItem = async (menuItemId, quantity) => {
  const response = await reservationApi.put(
    `/order-cart/items/${menuItemId}`,
    {
      quantity,
    }
  );

  return response.data;
};

/**
 * Remove one item from the cart.
 */
export const removeCartItem = async (menuItemId) => {
  const response = await reservationApi.delete(
    `/order-cart/items/${menuItemId}`
  );

  return response.data;
};

/**
 * Remove all items from the cart.
 */
export const clearCart = async () => {
  const response = await reservationApi.delete('/order-cart');
  return response.data;
};