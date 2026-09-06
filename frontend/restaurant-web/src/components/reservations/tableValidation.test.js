import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTableForm, sanitizeTablePayload } from './tableValidation.js';

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
  assert.equal(result.errors.status, "Status must be either 'Available' or 'Inactive'");
});

test('sanitizeTablePayload trims, uppercases table number, and normalizes fields', () => {
  const rawData = {
    tableNumber: '  t-10  ',
    capacity: '6',
    location: '  Private Dining  ',
    status: 'inactive',
  };

  const sanitized = sanitizeTablePayload(rawData);
  assert.deepEqual(sanitized, {
    tableNumber: 'T-10',
    capacity: 6,
    location: 'Private Dining',
    status: 'Inactive',
  });
});
