import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAuditDateRange,
  getAuditDatePreset,
  formatActionType
} from '../../services/adminAuditService.js';

// Helper functions matching AdminAuditLogsPage logic
function resolveResultBadge(result) {
  switch (result) {
    case 'Success':
      return { label: 'Success', color: '#065f46', bg: '#d1fae5', border: '#a7f3d0' };
    case 'Denied':
      return { label: 'Denied', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' };
    case 'Failed':
      return { label: 'Failed', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
    default:
      return { label: result || 'Unknown', color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
  }
}

function parseDetailsJsonSafe(detailsJson) {
  try {
    return JSON.stringify(JSON.parse(detailsJson || '{}'), null, 2);
  } catch {
    return detailsJson || 'No additional metadata recorded.';
  }
}

function calculatePagination(totalCount, pageSize) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  return {
    totalPages,
    pageSize: safePageSize
  };
}

function buildAuditQueryParams({ fromDate, toDate, actionType, search, page = 1, pageSize = 20 }) {
  const params = {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize))
  };

  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (actionType) params.actionType = actionType;
  if (search && search.trim()) params.search = search.trim();

  return params;
}

// Tests
test('validateAuditDateRange: accepts valid chronological range within 90 days', () => {
  const err = validateAuditDateRange('2026-10-01', '2026-10-08');
  assert.equal(err, null);
});

test('validateAuditDateRange: accepts same-day range (today)', () => {
  const err = validateAuditDateRange('2026-10-09', '2026-10-09');
  assert.equal(err, null);
});

test('validateAuditDateRange: rejects reverse date range', () => {
  const err = validateAuditDateRange('2026-10-10', '2026-10-05');
  assert.equal(err, "The 'from' date cannot be after the 'to' date.");
});

test('validateAuditDateRange: rejects range exceeding 90 days', () => {
  const err = validateAuditDateRange('2026-01-01', '2026-06-01');
  assert.equal(err, 'Date range cannot exceed 90 days.');
});

test('getAuditDatePreset: produces valid from and to dates', () => {
  const todayPreset = getAuditDatePreset('today');
  assert.ok(todayPreset.from);
  assert.ok(todayPreset.to);
  assert.equal(todayPreset.from, todayPreset.to);

  const last7Preset = getAuditDatePreset('last7');
  assert.ok(last7Preset.from <= last7Preset.to);

  const last30Preset = getAuditDatePreset('last30');
  assert.ok(last30Preset.from <= last30Preset.to);
});

test('formatActionType: provides human-friendly label and styling badges', () => {
  const userBlocked = formatActionType('USER_BLOCKED');
  assert.equal(userBlocked.label, 'User Blocked');
  assert.ok(userBlocked.color);
  assert.ok(userBlocked.bg);

  const menuUpdated = formatActionType('MENU_ITEM_UPDATED');
  assert.equal(menuUpdated.label, 'Dish Updated');
  assert.ok(menuUpdated.color);

  const resStatus = formatActionType('RESERVATION_STATUS_CHANGED');
  assert.equal(resStatus.label, 'Booking Status');
  assert.ok(resStatus.color);

  const tableCreated = formatActionType('TABLE_CREATED');
  assert.equal(tableCreated.label, 'Table Added');
  assert.ok(tableCreated.color);

  const unknownAction = formatActionType('CUSTOM_ACTION');
  assert.equal(unknownAction.label, 'CUSTOM_ACTION');
  assert.ok(unknownAction.color);
});

test('resolveResultBadge: returns correct colors and labels for outcomes', () => {
  const successBadge = resolveResultBadge('Success');
  assert.equal(successBadge.label, 'Success');
  assert.equal(successBadge.color, '#065f46');

  const deniedBadge = resolveResultBadge('Denied');
  assert.equal(deniedBadge.label, 'Denied');
  assert.equal(deniedBadge.color, '#991b1b');

  const failedBadge = resolveResultBadge('Failed');
  assert.equal(failedBadge.label, 'Failed');
  assert.equal(failedBadge.color, '#b45309');
});

test('parseDetailsJsonSafe: formats valid json and falls back gracefully', () => {
  const formatted = parseDetailsJsonSafe('{"targetUserId":5,"reason":"Policy violation"}');
  assert.ok(formatted.includes('"targetUserId": 5'));
  assert.ok(formatted.includes('"reason": "Policy violation"'));

  const rawFallback = parseDetailsJsonSafe('Non-json raw detail string');
  assert.equal(rawFallback, 'Non-json raw detail string');

  const emptyFallback = parseDetailsJsonSafe('');
  assert.equal(emptyFallback, '{}');
});

test('calculatePagination: computes correct totalPages for count and pageSize', () => {
  assert.deepEqual(calculatePagination(55, 20), { totalPages: 3, pageSize: 20 });
  assert.deepEqual(calculatePagination(0, 20), { totalPages: 1, pageSize: 20 });
  assert.deepEqual(calculatePagination(20, 20), { totalPages: 1, pageSize: 20 });
  assert.deepEqual(calculatePagination(21, 20), { totalPages: 2, pageSize: 20 });
});

test('buildAuditQueryParams: sanitizes and constraints query parameters', () => {
  const params = buildAuditQueryParams({
    fromDate: '2026-10-01',
    toDate: '2026-10-08',
    actionType: 'USER_BLOCKED',
    search: '  admin@bistro.com  ',
    page: 2,
    pageSize: 50
  });

  assert.equal(params.page, 2);
  assert.equal(params.pageSize, 50);
  assert.equal(params.fromDate, '2026-10-01');
  assert.equal(params.toDate, '2026-10-08');
  assert.equal(params.actionType, 'USER_BLOCKED');
  assert.equal(params.search, 'admin@bistro.com');
});
