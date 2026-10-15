import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatedEndTime, validateAvailabilitySearch } from './availabilitySearchView.js';

test('availability validation rejects required values and guest count below one', () => {
  const errors = validateAvailabilitySearch({ date: '', startTime: '', durationMinutes: '0', guestCount: '0' });
  assert.ok(errors.date); assert.ok(errors.startTime); assert.ok(errors.durationMinutes); assert.ok(errors.guestCount);
});

test('availability validation rejects past local start and accepts a future search', () => {
  const now = new Date('2026-09-11T12:00:00');
  assert.ok(validateAvailabilitySearch({ date: '2026-09-11', startTime: '11:00', durationMinutes: '90', guestCount: '4' }, now).startTime);
  assert.deepEqual(validateAvailabilitySearch({ date: '2026-09-12', startTime: '19:00', durationMinutes: '90', guestCount: '4' }, now), {});
});

test('calculated end time carries duration into the SR-58 handoff', () => {
  assert.equal(calculatedEndTime({ date: '2026-09-12', startTime: '19:00', durationMinutes: '90' }), '20:30');
});
