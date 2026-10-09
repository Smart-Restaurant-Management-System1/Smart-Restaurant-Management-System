import test from 'node:test';
import assert from 'node:assert/strict';

function validateReservationSearchDates(visitFrom, visitTo) {
  if (visitFrom && visitTo) {
    const fromDate = new Date(visitFrom);
    const toDate = new Date(visitTo);
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

function filterReservations(items = [], filters = {}) {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.tableNumber && !item.tableNumber.toLowerCase().includes(filters.tableNumber.toLowerCase())) return false;
    if (filters.bookingReference && !item.bookingReference.toLowerCase().includes(filters.bookingReference.toLowerCase())) return false;
    if (filters.customer) {
      const q = filters.customer.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchEmail = item.customerEmail?.toLowerCase().includes(q);
      const matchId = String(item.customerId).includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });
}

test('validateReservationSearchDates: accepts valid range within 90 days', () => {
  const result = validateReservationSearchDates('2026-10-01', '2026-10-25');
  assert.equal(result.isValid, true);
  assert.equal(result.error, null);
});

test('validateReservationSearchDates: rejects when from date is after to date', () => {
  const result = validateReservationSearchDates('2026-10-25', '2026-10-01');
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'From date must not be later than To date.');
});

test('validateReservationSearchDates: rejects when range exceeds 90 days', () => {
  const result = validateReservationSearchDates('2026-01-01', '2026-06-01');
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'Date range cannot exceed 90 days.');
});

test('filterReservations: filters accurately by customer name and contact', () => {
  const sampleData = [
    { reservationId: 1, customerId: 10, customerName: 'Alice Silva', customerEmail: 'alice@bistro.lk', status: 'Confirmed', bookingReference: 'CB-101', tableNumber: 'T-01' },
    { reservationId: 2, customerId: 11, customerName: 'Bob Perera', customerEmail: 'bob@gmail.com', status: 'Pending', bookingReference: 'CB-102', tableNumber: 'T-02' },
    { reservationId: 3, customerId: 12, customerName: 'Charlie Dias', customerEmail: 'charlie@yahoo.com', status: 'Cancelled', bookingReference: 'CB-103', tableNumber: 'T-03' },
  ];

  const matchedByName = filterReservations(sampleData, { customer: 'alice' });
  assert.equal(matchedByName.length, 1);
  assert.equal(matchedByName[0].customerName, 'Alice Silva');

  const matchedByEmail = filterReservations(sampleData, { customer: 'gmail.com' });
  assert.equal(matchedByEmail.length, 1);
  assert.equal(matchedByEmail[0].customerName, 'Bob Perera');

  const matchedById = filterReservations(sampleData, { customer: '12' });
  assert.equal(matchedById.length, 1);
  assert.equal(matchedById[0].customerName, 'Charlie Dias');
});
