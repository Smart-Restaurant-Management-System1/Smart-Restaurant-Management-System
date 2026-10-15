import test from 'node:test';
import assert from 'node:assert/strict';

test('reservation payload contains only untrusted booking fields', () => {
  const payload = { tableId: 4, date: '2026-09-20', startTime: '19:00', durationMinutes: 90, guestCount: 4 };
  assert.deepEqual(Object.keys(payload), ['tableId', 'date', 'startTime', 'durationMinutes', 'guestCount']);
  assert.equal('customerId' in payload, false);
  assert.equal('bookingReference' in payload, false);
  assert.equal('status' in payload, false);
});
