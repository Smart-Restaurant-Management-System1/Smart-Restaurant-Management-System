import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCartItems,
  getMenuItemId,
  getItemName,
  getItemPrice,
  getItemQuantity,
  calculateItemSubtotal,
  calculateCartSubtotal,
  formatOrderCurrency,
  validateCartForCheckout,
  validateDineInOrder,
  validateReservationPreOrder,
  generateIdempotencyKey,
} from './cartOrderValidation.js';

test('getCartItems extracts items from various backend response shapes', () => {
  // Array direct
  assert.equal(getCartItems([{ menuItemId: 1 }]).length, 1);

  // Object with items array
  assert.equal(getCartItems({ items: [{ menuItemId: 2 }, { menuItemId: 3 }] }).length, 2);

  // Object with cartItems array
  assert.equal(getCartItems({ cartItems: [{ menuItemId: 4 }] }).length, 1);

  // Object with orderItems array
  assert.equal(getCartItems({ orderItems: [{ menuItemId: 5 }] }).length, 1);

  // Null or undefined or empty
  assert.deepEqual(getCartItems(null), []);
  assert.deepEqual(getCartItems(undefined), []);
  assert.deepEqual(getCartItems({}), []);
});

test('getMenuItemId handles camelCase, PascalCase, and nested menuItem', () => {
  assert.equal(getMenuItemId({ menuItemId: 10 }), 10);
  assert.equal(getMenuItemId({ MenuItemId: 11 }), 11);
  assert.equal(getMenuItemId({ menuItem: { menuItemId: 12 } }), 12);
  assert.equal(getMenuItemId({ menuItem: { MenuItemId: 13 } }), 13);
  assert.equal(getMenuItemId({ id: 14 }), 14);
  assert.equal(getMenuItemId({}), null);
});

test('getItemName extracts correct name with fallback', () => {
  assert.equal(getItemName({ itemName: 'Ribeye Steak' }), 'Ribeye Steak');
  assert.equal(getItemName({ ItemName: 'Salmon Fillet' }), 'Salmon Fillet');
  assert.equal(getItemName({ menuItem: { itemName: 'Bruschetta' } }), 'Bruschetta');
  assert.equal(getItemName({}), 'Menu Item');
});

test('getItemPrice and getItemQuantity parse numerical values correctly', () => {
  assert.equal(getItemPrice({ unitPrice: 2500 }), 2500);
  assert.equal(getItemPrice({ price: '1850.50' }), 1850.5);
  assert.equal(getItemPrice({ menuItem: { price: 3200 } }), 3200);
  assert.equal(getItemPrice({ unitPrice: -100 }), 0); // Negative safeguard
  assert.equal(getItemPrice({}), 0);

  assert.equal(getItemQuantity({ quantity: 3 }), 3);
  assert.equal(getItemQuantity({ Quantity: '5' }), 5);
  assert.equal(getItemQuantity({ quantity: 0 }), 1); // 0 or invalid falls back to 1
  assert.equal(getItemQuantity({}), 1);
});

test('calculateCartSubtotal accurately sums multiple items with fractional amounts', () => {
  const cart = {
    items: [
      { menuItemId: 1, unitPrice: 1500, quantity: 2 }, // 3000
      { menuItemId: 2, unitPrice: 450.5, quantity: 3 }, // 1351.5
      { menuItemId: 3, unitPrice: 850, quantity: 1 },  // 850
    ],
  };

  const subtotal = calculateCartSubtotal(cart);
  assert.equal(subtotal, 5201.5);
  assert.equal(formatOrderCurrency(subtotal), 'Rs. 5,201.50');
});

test('validateCartForCheckout flags empty cart', () => {
  const emptyCart = { items: [] };
  const result = validateCartForCheckout(emptyCart);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'Your cart is empty. Add menu items before submitting.');
});

test('validateCartForCheckout flags invalid item IDs', () => {
  const invalidCart = {
    items: [{ menuItemId: null, unitPrice: 500, quantity: 2 }],
  };
  const result = validateCartForCheckout(invalidCart);
  assert.equal(result.isValid, false);
  assert.match(result.error, /missing a valid menu item reference/);
});

test('validateCartForCheckout flags out-of-bounds quantities (over 99)', () => {
  const invalidCart = {
    items: [{ menuItemId: 1, itemName: 'Cocktail', unitPrice: 500, quantity: 100 }],
  };
  const result = validateCartForCheckout(invalidCart);
  assert.equal(result.isValid, false);
  assert.match(result.error, /must be between 1 and 99/);
});

test('validateDineInOrder validates table selection and cart integrity', () => {
  const validCart = {
    items: [{ menuItemId: 1, unitPrice: 1000, quantity: 1 }],
  };

  // Missing table
  const missingTable = validateDineInOrder('', validCart);
  assert.equal(missingTable.isValid, false);
  assert.equal(missingTable.error, 'Please select a dining table for your order.');

  // Valid table and cart
  const valid = validateDineInOrder('4', validCart);
  assert.equal(valid.isValid, true);
  assert.equal(valid.error, null);
});

test('validateReservationPreOrder validates reservation selection and cart integrity', () => {
  const validCart = {
    items: [{ menuItemId: 2, unitPrice: 1200, quantity: 2 }],
  };

  // Missing reservation
  const missingRes = validateReservationPreOrder(null, validCart);
  assert.equal(missingRes.isValid, false);
  assert.equal(
    missingRes.error,
    'Please select an upcoming reservation before confirming your pre-order.'
  );

  // Valid reservation and cart
  const valid = validateReservationPreOrder('105', validCart);
  assert.equal(valid.isValid, true);
  assert.equal(valid.error, null);
});

test('generateIdempotencyKey produces non-empty unique strings', () => {
  const key1 = generateIdempotencyKey();
  const key2 = generateIdempotencyKey();
  assert.ok(key1 && typeof key1 === 'string');
  assert.ok(key2 && typeof key2 === 'string');
  assert.notEqual(key1, key2);
});

