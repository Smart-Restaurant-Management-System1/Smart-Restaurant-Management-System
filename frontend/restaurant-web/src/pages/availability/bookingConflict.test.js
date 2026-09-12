import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingConflictMessage, isBookingConflict, safeSearchCriteria } from './bookingConflict.js';

test('recognizes only the stable booking-conflict contract', () => {
  assert.equal(isBookingConflict({ response: { status: 409, data: { code: 'TABLE_NO_LONGER_AVAILABLE' } } }), true);
  assert.equal(isBookingConflict({ response: { status: 409, data: { code: 'INVALID_RESERVATION_STATE' } } }), false);
  assert.match(bookingConflictMessage, /another customer/i);
});

test('preserves only safe availability-search criteria', () => {
  assert.deepEqual(safeSearchCriteria({ date: '2026-09-20', startTime: '19:00', durationMinutes: 90, guestCount: 4, token: 'secret', customerId: 7 }), { date: '2026-09-20', startTime: '19:00', durationMinutes: 90, guestCount: 4 });
});
