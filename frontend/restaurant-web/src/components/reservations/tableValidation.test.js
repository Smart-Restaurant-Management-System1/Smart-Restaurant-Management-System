import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTableForm,
  sanitizeTablePayload,
  validateTableEditForm,
  sanitizeTableEditPayload,
} from './tableValidation.js';

test('validateTableForm succeeds with valid table data', () => {
  const data = {
    tableNumber: 'T-01',
    capacity: 4,
    location: 'Window',
    status: 'Available',
  };

  const result = validateTableForm(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('validateTableForm flags missing or empty required fields', () => {
  const data = {
    tableNumber: '   ',
    capacity: '',
    location: '',
    status: 'Available',
  };

  const result = validateTableForm(data);
  assert.equal(result.isValid, false);
  assert.equal(result.errors.tableNumber, 'Table number is required');
  assert.equal(result.errors.capacity, 'Capacity is required');
  assert.equal(result.errors.location, 'Location / Section is required');
});

test('validateTableForm flags zero and negative capacity', () => {
  const zeroCap = validateTableForm({ tableNumber: 'T-02', capacity: 0, location: 'Patio' });
  assert.equal(zeroCap.isValid, false);
  assert.equal(zeroCap.errors.capacity, 'Capacity must be at least 1 person');

  const negCap = validateTableForm({ tableNumber: 'T-02', capacity: -5, location: 'Patio' });
  assert.equal(negCap.isValid, false);
  assert.equal(negCap.errors.capacity, 'Capacity must be at least 1 person');
});

test('validateTableForm flags capacity over 100', () => {
  const result = validateTableForm({ tableNumber: 'T-03', capacity: 101, location: 'Hall' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.capacity, 'Capacity cannot exceed 100 persons');
});

test('validateTableForm flags invalid status values', () => {
  const result = validateTableForm({
    tableNumber: 'T-04',
    capacity: 2,
    location: 'Bar Area',
    status: 'UnknownStatus',
  });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.status, "Status must be 'Available', 'Occupied', or 'Inactive'");
});

test('validateTableForm accepts Occupied status', () => {
  const result = validateTableForm({
    tableNumber: 'T-05',
    capacity: 4,
    location: 'Main Dining',
    status: 'Occupied',
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('sanitizeTablePayload trims, uppercases table number, and normalizes fields', () => {
  const rawData = {
    tableNumber: '  t-10  ',
    capacity: '6',
    location: '  Private Dining  ',
    status: 'occupied',
  };

  const sanitized = sanitizeTablePayload(rawData);
  assert.deepEqual(sanitized, {
    tableNumber: 'T-10',
    capacity: 6,
    location: 'Private Dining',
    status: 'Occupied',
  });
});

test('validateTableEditForm succeeds with valid capacity and location', () => {
  const data = {
    capacity: '8',
    location: 'Garden Terrace',
  };

  const result = validateTableEditForm(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('validateTableEditForm flags missing capacity and missing location', () => {
  const result = validateTableEditForm({ capacity: '', location: '   ' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.capacity, 'Capacity is required');
  assert.equal(result.errors.location, 'Location / Section is required');
});

test('validateTableEditForm flags capacity bounds (<= 0 or > 100)', () => {
  const zeroResult = validateTableEditForm({ capacity: 0, location: 'Bar' });
  assert.equal(zeroResult.isValid, false);
  assert.equal(zeroResult.errors.capacity, 'Capacity must be at least 1 person');

  const overResult = validateTableEditForm({ capacity: 101, location: 'Bar' });
  assert.equal(overResult.isValid, false);
  assert.equal(overResult.errors.capacity, 'Capacity cannot exceed 100 persons');
});

test('sanitizeTableEditPayload preserves only editable fields and ignores tableNumber/id', () => {
  const rawData = {
    id: 99,
    tableNumber: 'T-999-OVERWRITE',
    capacity: '12',
    location: '  VIP Room  ',
    status: 'available',
  };

  const sanitized = sanitizeTableEditPayload(rawData);
  assert.deepEqual(sanitized, {
    capacity: 12,
    location: 'VIP Room',
    status: 'Available',
  });
  assert.equal(sanitized.tableNumber, undefined);
  assert.equal(sanitized.id, undefined);
});
