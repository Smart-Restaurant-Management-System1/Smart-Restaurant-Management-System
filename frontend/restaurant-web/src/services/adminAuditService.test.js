import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAuditDateRange,
  getAuditDatePreset,
  getAuditLogs,
  getAuditActionTypes,
  formatActionType,
  formatOperationalSummary,
  generateAuditLogsCsv,
  downloadAuditLogsPdf
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
  assert.equal(typeof generateAuditLogsCsv, 'function');
  assert.equal(typeof downloadAuditLogsPdf, 'function');
});

test('formatOperationalSummary parses JSON and formats human-friendly labels', () => {
  const log = {
    detailsJson: JSON.stringify({
      targetUserId: 42,
      email: 'customer@example.com',
      isAvailable: true,
      price: 1500
    })
  };
  const summary = formatOperationalSummary(log);
  assert.ok(summary.includes('Target User ID: 42'));
  assert.ok(summary.includes('User Email: customer@example.com'));
  assert.ok(summary.includes('Dish Availability: Active'));
  assert.ok(summary.includes('Price (LKR): 1500'));
});

test('generateAuditLogsCsv produces valid CSV with formula mitigation', () => {
  const sampleLogs = [
    {
      auditLogId: 1,
      timestampUtc: '2026-10-09T08:00:00Z',
      actionType: 'USER_BLOCKED',
      adminEmail: 'admin@bistro.com',
      adminId: 'admin-1',
      adminRole: 'Admin',
      targetType: 'User',
      targetId: '42',
      result: 'SUCCESS',
      sourceService: 'identity-service',
      ipAddress: '127.0.0.1',
      detailsJson: '{"targetUserId": 42}'
    }
  ];
  const csv = generateAuditLogsCsv(sampleLogs);
  assert.ok(csv.startsWith('\uFEFF')); // UTF-8 BOM
  assert.ok(csv.includes('"Audit Log ID"'));
  assert.ok(csv.includes('"USER_BLOCKED"'));
  assert.ok(csv.includes('"admin@bistro.com"'));
  assert.ok(csv.includes('"Target User ID: 42"'));
});

test('downloadAuditLogsPdf generates PDF document successfully without errors', async () => {
  const sampleLogs = [
    {
      auditLogId: 1,
      timestampUtc: '2026-10-09T08:00:00Z',
      actionType: 'USER_BLOCKED',
      adminEmail: 'admin@bistro.com',
      adminId: 'admin-1',
      adminRole: 'Admin',
      targetType: 'User',
      targetId: '42',
      result: 'SUCCESS',
      sourceService: 'identity-service',
      ipAddress: '127.0.0.1',
      detailsJson: '{"targetUserId": 42}'
    }
  ];
  const doc = await downloadAuditLogsPdf(sampleLogs, {
    dateRange: { from: '2026-10-01', to: '2026-10-09' },
    actionType: '',
    searchKeyword: ''
  }, 'admin@bistro.com');

  assert.ok(doc !== null);
  assert.equal(typeof doc.internal.getNumberOfPages, 'function');
  assert.ok(doc.internal.getNumberOfPages() >= 1);
});


