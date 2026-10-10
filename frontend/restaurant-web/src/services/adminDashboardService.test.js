import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDashboardDateRange,
  getDatePreset,
  getDashboardOverview,
  getReservationsSummary,
  getOrdersSummary
} from './adminDashboardService.js';

test('validateDashboardDateRange: returns null when either date is missing', () => {
  assert.equal(validateDashboardDateRange(null, '2026-10-09'), null);
  assert.equal(validateDashboardDateRange('2026-10-01', ''), null);
  assert.equal(validateDashboardDateRange('', ''), null);
});

test('validateDashboardDateRange: rejects when from date is after to date', () => {
  const result = validateDashboardDateRange('2026-10-10', '2026-10-01');
  assert.equal(result, 'From date must not be later than To date.');
});

test('validateDashboardDateRange: rejects when range exceeds 90 days', () => {
  const result = validateDashboardDateRange('2026-01-01', '2026-04-15');
  assert.equal(result, 'Date range cannot exceed 90 days.');
});

test('validateDashboardDateRange: accepts valid 7-day and 30-day ranges', () => {
  assert.equal(validateDashboardDateRange('2026-10-01', '2026-10-08'), null);
  assert.equal(validateDashboardDateRange('2026-09-01', '2026-09-30'), null);
  assert.equal(validateDashboardDateRange('2026-10-09', '2026-10-09'), null);
});

test('getDatePreset: produces valid from and to date strings', () => {
  const today = getDatePreset('today');
  assert.equal(today.from, today.to);

  const last7 = getDatePreset('last7');
  assert.ok(last7.from <= last7.to);

  const last30 = getDatePreset('last30');
  assert.ok(last30.from <= last30.to);

  const dFrom = new Date(last7.from);
  const dTo = new Date(last7.to);
  const diffDays = Math.round((dTo - dFrom) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 6);
});

test('adminDashboardService exports required API functions', () => {
  assert.equal(typeof getDashboardOverview, 'function');
  assert.equal(typeof getReservationsSummary, 'function');
  assert.equal(typeof getOrdersSummary, 'function');
});

