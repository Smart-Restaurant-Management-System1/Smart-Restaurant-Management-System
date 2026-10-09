import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAuditDateRange,
  getAuditDatePreset,
  getAuditLogs,
  getAuditActionTypes,
  formatActionType
} from './adminAuditService.js';

test('validateAuditDateRange: returns null when either date is missing', () => {
  assert.equal(validateAuditDateRange(null, '2026-10-09'), null);
  assert.equal(validateAuditDateRange('2026-10-01', ''), null);
  assert.equal(validateAuditDateRange('', ''), null);
});

test('validateAuditDateRange: rejects when from date is after to date', () => {
  const result = validateAuditDateRange('2026-10-10', '2026-10-01');
  assert.equal(result, "The 'from' date cannot be after the 'to' date.");
});

test('validateAuditDateRange: rejects when range exceeds 90 days', () => {
  const result = validateAuditDateRange('2026-01-01', '2026-04-15');
  assert.equal(result, 'Date range cannot exceed 90 days.');
});

test('validateAuditDateRange: accepts valid date ranges', () => {
  assert.equal(validateAuditDateRange('2026-10-01', '2026-10-08'), null);
  assert.equal(validateAuditDateRange('2026-10-09', '2026-10-09'), null);
});

test('getAuditDatePreset: produces valid from and to date strings', () => {
  const today = getAuditDatePreset('today');
  assert.equal(today.from, today.to);

  const last7 = getAuditDatePreset('last7');
  assert.ok(last7.from <= last7.to);

  const last30 = getAuditDatePreset('last30');
  assert.ok(last30.from <= last30.to);
});

test('formatActionType: formats badges for known action types correctly', () => {
  const block = formatActionType('USER_BLOCKED');
  assert.equal(block.label, 'User Blocked');
  assert.ok(block.color);
  assert.ok(block.bg);

  const menu = formatActionType('MENU_ITEM_CREATED');
  assert.equal(menu.label, 'Dish Created');

  const custom = formatActionType('SOME_CUSTOM_ACTION');
  assert.equal(custom.label, 'SOME_CUSTOM_ACTION');
});

test('adminAuditService exports required API functions', () => {
  assert.equal(typeof getAuditLogs, 'function');
  assert.equal(typeof getAuditActionTypes, 'function');
});

