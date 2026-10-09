import test from 'node:test';
import assert from 'node:assert/strict';

function validateOrderSearchDates(dateFrom, dateTo) {
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    if (fromDate > toDate) {
      return { isValid: false, error: 'From date must not be later than To date.' };
    }
    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      return { isValid: false, error: 'Date range cannot exceed 90 days.' };
    }
  }
  return { isValid: true, error: null };
}

function filterOrders(items = [], filters = {}) {
  return items.filter((item) => {
    if (filters.orderReference && !item.orderReference.toLowerCase().includes(filters.orderReference.toLowerCase())) {
      return false;
    }
    if (filters.orderType && item.orderType !== filters.orderType) {
      return false;
    }
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    if (filters.customer) {
      const q = filters.customer.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchEmail = item.customerEmail?.toLowerCase().includes(q);
      const matchId = String(item.customerId).includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    if (filters.tableNumber && !String(item.tableNumber).toLowerCase().includes(filters.tableNumber.toLowerCase())) {
      return false;
    }
    return true;
  });
}

test('validateOrderSearchDates: accepts valid range within 90 days', () => {
  const result = validateOrderSearchDates('2026-10-01', '2026-10-20');
  assert.equal(result.isValid, true);
  assert.equal(result.error, null);
});

test('validateOrderSearchDates: rejects when from date is after to date', () => {
  const result = validateOrderSearchDates('2026-10-20', '2026-10-05');
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'From date must not be later than To date.');
});

test('validateOrderSearchDates: rejects when range exceeds 90 days', () => {
  const result = validateOrderSearchDates('2026-01-01', '2026-05-15');
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'Date range cannot exceed 90 days.');
});

test('filterOrders: correctly filters by order type and status', () => {
  const orders = [
    { orderId: 1, orderReference: 'DIN-000001', orderType: 'DineIn', status: 'Received', customerName: 'John', tableNumber: 'T-01' },
    { orderId: 2, orderReference: 'PRE-000002', orderType: 'ReservationPreOrder', status: 'InPreparation', customerName: 'Mary', tableNumber: 'T-02' },
    { orderId: 3, orderReference: 'DIN-000003', orderType: 'DineIn', status: 'Completed', customerName: 'David', tableNumber: 'T-03' },
  ];

  const dineInOnly = filterOrders(orders, { orderType: 'DineIn' });
  assert.equal(dineInOnly.length, 2);

  const preOrderOnly = filterOrders(orders, { orderType: 'ReservationPreOrder' });
  assert.equal(preOrderOnly.length, 1);
  assert.equal(preOrderOnly[0].orderReference, 'PRE-000002');

  const receivedOnly = filterOrders(orders, { status: 'Received' });
  assert.equal(receivedOnly.length, 1);
  assert.equal(receivedOnly[0].orderReference, 'DIN-000001');
});

