import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMenuMetrics,
  validateMenuItemPayload,
} from '../../components/menu/menuValidation.js';

test('calculateMenuMetrics accurately calculates catalog metrics', () => {
  const mockItems = [
    { menuItemId: 1, itemName: 'Dish A', category: 'Appetizer', price: 1200, isAvailable: true },
    { menuItemId: 2, itemName: 'Dish B', category: 'Main Course', price: 2500, isAvailable: true },
    { menuItemId: 3, itemName: 'Dish C', category: 'Main Course', price: 3100, isAvailable: false },
    { menuItemId: 4, itemName: 'Dish D', category: 'Dessert', price: 800, isAvailable: false },
  ];

  const metrics = calculateMenuMetrics(mockItems);

  assert.equal(metrics.total, 4);
  assert.equal(metrics.available, 2);
  assert.equal(metrics.unavailable, 2);
  assert.equal(metrics.categoriesCount, 3);
});

test('calculateMenuMetrics handles empty catalog safely', () => {
  const metrics = calculateMenuMetrics([]);

  assert.equal(metrics.total, 0);
  assert.equal(metrics.available, 0);
  assert.equal(metrics.unavailable, 0);
  assert.equal(metrics.categoriesCount, 0);
});

test('validateMenuItemPayload accepts valid dish form input', () => {
  const validForm = {
    itemName: 'Ceylon Spiced Lobster',
    price: '3450.00',
    category: 'Main Course',
    dietaryInfo: 'Gluten-Free',
    imageReference: 'https://images.unsplash.com/photo-123',
    isAvailable: true,
  };

  const result = validateMenuItemPayload(validForm);
  assert.equal(result.isValid, true);
  assert.equal(result.error, null);
});

test('validateMenuItemPayload rejects missing dish name', () => {
  const form = {
    itemName: '   ',
    price: '1200',
  };

  const result = validateMenuItemPayload(form);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'Dish name is required.');
});

test('validateMenuItemPayload rejects zero or negative price', () => {
  const zeroPrice = validateMenuItemPayload({ itemName: 'Soup', price: '0' });
  assert.equal(zeroPrice.isValid, false);
  assert.equal(zeroPrice.error, 'Please enter a valid price greater than zero.');

  const negativePrice = validateMenuItemPayload({ itemName: 'Soup', price: '-50' });
  assert.equal(negativePrice.isValid, false);
  assert.equal(negativePrice.error, 'Please enter a valid price greater than zero.');

  const nonNumericPrice = validateMenuItemPayload({ itemName: 'Soup', price: 'abc' });
  assert.equal(nonNumericPrice.isValid, false);
  assert.equal(nonNumericPrice.error, 'Please enter a valid price greater than zero.');
});

test('validateMenuItemPayload validates image URL protocol and supports relative upload paths', () => {
  const invalidUrl = validateMenuItemPayload({
    itemName: 'Soup',
    price: '500',
    imageReference: 'ftp://example.com/pic.jpg',
  });
  assert.equal(invalidUrl.isValid, false);
  assert.equal(invalidUrl.error, 'Image URL must begin with http:// or https://.');

  const malformedUrl = validateMenuItemPayload({
    itemName: 'Soup',
    price: '500',
    imageReference: 'not a url at all',
  });
  assert.equal(malformedUrl.isValid, false);
  assert.equal(malformedUrl.error, 'Please enter a valid image URL or upload a photo.');

  // Direct upload relative path
  const uploadPath = validateMenuItemPayload({
    itemName: 'Spiced Salmon',
    price: '2800',
    imageReference: '/uploads/menu-images/dish_abc123.webp',
  });
  assert.equal(uploadPath.isValid, true);
  assert.equal(uploadPath.error, null);
});


