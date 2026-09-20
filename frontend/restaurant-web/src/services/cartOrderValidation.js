/**
 * cartOrderValidation.js
 * Pure validation, extraction, and calculation helpers for cart, dine-in orders, and reservation pre-orders.
 */

export const getCartItems = (cartData) => {
  if (Array.isArray(cartData)) return cartData;
  if (Array.isArray(cartData?.items)) return cartData.items;
  if (Array.isArray(cartData?.cartItems)) return cartData.cartItems;
  if (Array.isArray(cartData?.orderItems)) return cartData.orderItems;
  return [];
};

export const getMenuItemId = (item) => {
  const id =
    item?.menuItemId ??
    item?.MenuItemId ??
    item?.menuItem?.menuItemId ??
    item?.menuItem?.MenuItemId ??
    item?.id ??
    item?.Id;
  return id !== undefined && id !== null ? Number(id) : null;
};

export const getItemName = (item) =>
  item?.itemName ??
  item?.ItemName ??
  item?.name ??
  item?.Name ??
  item?.menuItem?.itemName ??
  item?.menuItem?.ItemName ??
  'Menu Item';

export const getItemPrice = (item) => {
  const raw =
    item?.unitPrice ??
    item?.UnitPrice ??
    item?.price ??
    item?.Price ??
    item?.menuItem?.price ??
    item?.menuItem?.Price ??
    0;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

export const getItemQuantity = (item) => {
  const raw = item?.quantity ?? item?.Quantity ?? 1;
  const num = parseInt(raw, 10);
  return Number.isFinite(num) && num > 0 ? num : 1;
};

export const calculateItemSubtotal = (item) => {
  return getItemPrice(item) * getItemQuantity(item);
};

export const calculateCartSubtotal = (cartData) => {
  const items = getCartItems(cartData);
  return items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
};

export const formatOrderCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const validateCartForCheckout = (cartData) => {
  const items = getCartItems(cartData);

  if (!items || items.length === 0) {
    return {
      isValid: false,
      error: 'Your cart is empty. Add menu items before submitting.',
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const menuItemId = getMenuItemId(item);
    const quantity = getItemQuantity(item);

    if (!menuItemId || menuItemId <= 0) {
      return {
        isValid: false,
        error: `Item at position ${i + 1} is missing a valid menu item reference.`,
      };
    }

    if (quantity < 1 || quantity > 99) {
      return {
        isValid: false,
        error: `Quantity for "${getItemName(item)}" must be between 1 and 99.`,
      };
    }
  }

  return { isValid: true, error: null };
};

export const validateDineInOrder = (tableId, cartData) => {
  if (!tableId || String(tableId).trim() === '') {
    return {
      isValid: false,
      error: 'Please select a dining table for your order.',
    };
  }

  return validateCartForCheckout(cartData);
};

export const validateReservationPreOrder = (reservationId, cartData) => {
  if (!reservationId || String(reservationId).trim() === '') {
    return {
      isValid: false,
      error: 'Please select an upcoming reservation before confirming your pre-order.',
    };
  }

  return validateCartForCheckout(cartData);
};

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `key-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

