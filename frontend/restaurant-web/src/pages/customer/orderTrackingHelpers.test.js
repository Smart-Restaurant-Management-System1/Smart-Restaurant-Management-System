import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_STEPS,
  normalizeStatus,
  formatOrderCurrency,
  formatOrderDateTime,
  calculateOrderMetrics,
  filterOrders,
} from './orderTrackingHelpers.js';

test('normalizeStatus maps legacy and backend status codes to UI pipeline states', () => {
  assert.equal(normalizeStatus('Received'), 'Pending');
  assert.equal(normalizeStatus('Confirmed'), 'Pending');
  assert.equal(normalizeStatus('Completed'), 'Served');
  assert.equal(normalizeStatus('Pending'), 'Pending');
  assert.equal(normalizeStatus('Preparing'), 'Preparing');
  assert.equal(normalizeStatus('Ready'), 'Ready');
  assert.equal(normalizeStatus('Served'), 'Served');
  assert.equal(normalizeStatus(''), 'Pending');
  assert.equal(normalizeStatus(null), 'Pending');
  assert.equal(normalizeStatus(undefined), 'Pending');
});

test('STATUS_STEPS contains 4 chronological stages with metadata', () => {
  assert.equal(STATUS_STEPS.length, 4);
  assert.deepEqual(
    STATUS_STEPS.map((s) => s.id),
    ['Pending', 'Preparing', 'Ready', 'Served']
  );
  STATUS_STEPS.forEach((step) => {
    assert.ok(step.label && step.desc);
  });
});

test('formatOrderCurrency handles zero, positive, and null amounts gracefully', () => {
  assert.match(formatOrderCurrency(1500), /Rs\.\s*1,500\.00/);
  assert.match(formatOrderCurrency(0), /Rs\.\s*0\.00/);
  assert.match(formatOrderCurrency(null), /Rs\.\s*0\.00/);
  assert.match(formatOrderCurrency(2550.75), /Rs\.\s*2,550\.75/);
});

test('formatOrderDateTime formats valid dates and returns N/A for invalid/null dates', () => {
  assert.equal(formatOrderDateTime(null), 'N/A');
  assert.equal(formatOrderDateTime(''), 'N/A');
  assert.equal(formatOrderDateTime('invalid-date'), 'N/A');

  const formatted = formatOrderDateTime('2026-09-25T14:30:00Z');
  assert.notEqual(formatted, 'N/A');
  assert.match(formatted, /2026/);
});

test('calculateOrderMetrics calculates active, ready, served, count and spend correctly', () => {
  const sampleOrders = [
    { status: 'Received', totalAmount: 1200 }, // Pending
    { status: 'Preparing', totalAmount: 2500 }, // Preparing -> activeKitchen = 2
    { status: 'Ready', totalAmount: 850 }, // Ready = 1
    { status: 'Completed', totalAmount: 4300 }, // Served = 1
    { status: 'Served', totalAmount: 1100 }, // Served = 2
  ];

  const metrics = calculateOrderMetrics(sampleOrders);

  assert.equal(metrics.activeKitchen, 2); // 1 Pending + 1 Preparing
  assert.equal(metrics.ready, 1);
  assert.equal(metrics.served, 2);
  assert.equal(metrics.totalOrders, 5);
  assert.equal(metrics.totalSpend, 9950);
});

test('calculateOrderMetrics safely handles empty array or invalid inputs', () => {
  const emptyMetrics = calculateOrderMetrics([]);
  assert.equal(emptyMetrics.activeKitchen, 0);
  assert.equal(emptyMetrics.ready, 0);
  assert.equal(emptyMetrics.served, 0);
  assert.equal(emptyMetrics.totalOrders, 0);
  assert.equal(emptyMetrics.totalSpend, 0);

  const nullMetrics = calculateOrderMetrics(null);
  assert.equal(nullMetrics.totalOrders, 0);
});

test('filterOrders correctly filters by status and type', () => {
  const sampleOrders = [
    { orderId: 1, status: 'Preparing', orderType: 'DineIn' },
    { orderId: 2, status: 'Ready', orderType: 'ReservationPreOrder' },
    { orderId: 3, status: 'Confirmed', orderType: 'DineIn' }, // normalized to Pending
  ];

  // Filter by status
  const preparingOnly = filterOrders(sampleOrders, { status: 'Preparing' });
  assert.equal(preparingOnly.length, 1);
  assert.equal(preparingOnly[0].orderId, 1);

  // Filter by normalized status
  const pendingOnly = filterOrders(sampleOrders, { status: 'Pending' });
  assert.equal(pendingOnly.length, 1);
  assert.equal(pendingOnly[0].orderId, 3);

  // Filter by order type
  const preOrdersOnly = filterOrders(sampleOrders, { type: 'ReservationPreOrder' });
  assert.equal(preOrdersOnly.length, 1);
  assert.equal(preOrdersOnly[0].orderId, 2);

  // Filter by both
  const matched = filterOrders(sampleOrders, { status: 'Ready', type: 'ReservationPreOrder' });
  assert.equal(matched.length, 1);

  // No match
  const none = filterOrders(sampleOrders, { status: 'Served', type: 'DineIn' });
  assert.equal(none.length, 0);
});
