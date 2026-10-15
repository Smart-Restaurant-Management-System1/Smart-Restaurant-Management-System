import test from 'node:test';
import assert from 'node:assert/strict';
import { canCancelReservation, isUpcomingReservation, statusClassName } from './reservationHistoryView.js';

const future = { startDateTime: '2030-05-20T19:00:00', status: 'Confirmed' };
test('history actions depend on server status and future visit time', () => {
  assert.equal(isUpcomingReservation(future, new Date('2030-05-01')), true);
  assert.equal(canCancelReservation(future, new Date('2030-05-01')), true);
  assert.equal(canCancelReservation({ ...future, status: 'Completed' }, new Date('2030-05-01')), false);
});
test('status badges have stable semantic CSS classes', () => assert.equal(statusClassName('Cancelled'), 'reservation-status reservation-status-cancelled'));
