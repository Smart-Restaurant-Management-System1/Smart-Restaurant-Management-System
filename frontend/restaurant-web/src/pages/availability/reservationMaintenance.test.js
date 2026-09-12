import test from 'node:test';
import assert from 'node:assert/strict';
import { editValues, updateRequest, validateEdit, maintenanceError, singleFlight } from './reservationMaintenance.js';

// --- editValues ---
const sampleReservation = {
  tableId: 3,
  startDateTime: '2031-06-15T14:30:00',
  endDateTime: '2031-06-15T16:00:00',
  guestCount: 4,
};

test('editValues extracts all editable fields from reservation DTO', () => {
  const form = editValues(sampleReservation);
  assert.equal(form.tableId, '3');
  assert.equal(form.date, '2031-06-15');
  assert.equal(form.startTime, '14:30');
  assert.equal(form.durationMinutes, '90');
  assert.equal(form.guestCount, '4');
});

test('editValues computes durationMinutes from start and end datetime', () => {
  const form = editValues({ ...sampleReservation, startDateTime: '2031-06-15T18:00:00', endDateTime: '2031-06-15T19:30:00' });
  assert.equal(form.durationMinutes, '90');
});

// --- updateRequest ---
test('updateRequest sends only schedulable fields and no ownership or audit fields', () => {
  const form = { tableId: '3', date: '2031-06-15', startTime: '14:30', durationMinutes: '90', guestCount: '4' };
  const req = updateRequest(form);
  assert.deepEqual(Object.keys(req).sort(), ['date', 'durationMinutes', 'guestCount', 'startTime', 'tableId']);
  assert.equal(typeof req.tableId, 'number');
  assert.equal(typeof req.durationMinutes, 'number');
  assert.equal(typeof req.guestCount, 'number');
  assert.equal(req.tableId, 3);
  assert.equal(req.durationMinutes, 90);
  assert.equal(req.guestCount, 4);
});

test('updateRequest does not include customerId, status, bookingReference or audit fields', () => {
  const form = { tableId: '1', date: '2031-01-01', startTime: '18:00', durationMinutes: '60', guestCount: '2',
    customerId: 99, status: 'Completed', bookingReference: 'FORGED', createdAt: 'x', updatedAt: 'x' };
  const req = updateRequest(form);
  assert.equal(req.customerId, undefined);
  assert.equal(req.status, undefined);
  assert.equal(req.bookingReference, undefined);
  assert.equal(req.createdAt, undefined);
  assert.equal(req.updatedAt, undefined);
});

// --- validateEdit ---
test('validateEdit accepts a fully valid form', () => {
  const form = { tableId: '3', date: '2031-06-15', startTime: '14:30', durationMinutes: '90', guestCount: '4' };
  assert.deepEqual(validateEdit(form), {});
});

test('validateEdit rejects missing or malformed date', () => {
  assert.ok(validateEdit({ tableId: '1', date: 'not-a-date', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).date);
  assert.ok(validateEdit({ tableId: '1', date: '', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).date);
  assert.ok(validateEdit({ tableId: '1', date: '15-06-2031', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).date);
});

test('validateEdit rejects invalid start time', () => {
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '25:00', durationMinutes: '60', guestCount: '2' }).startTime);
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '', durationMinutes: '60', guestCount: '2' }).startTime);
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '9:30', durationMinutes: '60', guestCount: '2' }).startTime);
});

test('validateEdit rejects invalid tableId', () => {
  assert.ok(validateEdit({ tableId: '0', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).tableId);
  assert.ok(validateEdit({ tableId: '-1', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).tableId);
  assert.ok(validateEdit({ tableId: '', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '2' }).tableId);
});

test('validateEdit rejects non-positive guestCount', () => {
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '0' }).guestCount);
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '-1' }).guestCount);
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '14:00', durationMinutes: '60', guestCount: '1.5' }).guestCount);
});

test('validateEdit rejects non-positive durationMinutes', () => {
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '14:00', durationMinutes: '0', guestCount: '2' }).durationMinutes);
  assert.ok(validateEdit({ tableId: '1', date: '2031-06-15', startTime: '14:00', durationMinutes: '-30', guestCount: '2' }).durationMinutes);
});

// --- maintenanceError ---
test('maintenanceError maps 401 to session-expired message', () => {
  const msg = maintenanceError({ response: { status: 401 } });
  assert.ok(msg.toLowerCase().includes('session') || msg.toLowerCase().includes('sign in'));
});

test('maintenanceError maps 403 to permission message', () => {
  const msg = maintenanceError({ response: { status: 403 } });
  assert.ok(msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('do not'));
});

test('maintenanceError maps 404 to not-found message', () => {
  const msg = maintenanceError({ response: { status: 404 } });
  assert.ok(msg.toLowerCase().includes('not found'));
});

test('maintenanceError maps 409 TABLE_NO_LONGER_AVAILABLE to conflict message', () => {
  const msg = maintenanceError({ response: { status: 409, data: { code: 'TABLE_NO_LONGER_AVAILABLE' } } });
  assert.ok(msg.toLowerCase().includes('available') || msg.toLowerCase().includes('table'));
});

test('maintenanceError maps 409 other code to state-change message', () => {
  const msg = maintenanceError({ response: { status: 409, data: { code: 'INVALID_RESERVATION_STATE' } } });
  assert.ok(msg.toLowerCase().includes('reload') || msg.toLowerCase().includes('changed') || msg.toLowerCase().includes('no longer'));
});

test('maintenanceError maps 400 to validation message', () => {
  const msg = maintenanceError({ response: { status: 400 } });
  assert.ok(msg.toLowerCase().includes('booking') || msg.toLowerCase().includes('correct') || msg.toLowerCase().includes('detail'));
});

test('maintenanceError returns safe fallback for unexpected errors', () => {
  const msg = maintenanceError(null);
  assert.ok(typeof msg === 'string' && msg.length > 0);
  const msg2 = maintenanceError({ response: { status: 500 } });
  assert.ok(typeof msg2 === 'string' && msg2.length > 0);
});

// --- singleFlight ---
test('singleFlight prevents concurrent execution', async () => {
  const guard = singleFlight();
  let running = 0;
  let maxConcurrent = 0;
  const slow = () => guard(async () => {
    running++;
    maxConcurrent = Math.max(maxConcurrent, running);
    await new Promise(resolve => setTimeout(resolve, 20));
    running--;
  });
  await Promise.all([slow(), slow(), slow()]);
  assert.equal(maxConcurrent, 1);
});

test('singleFlight allows sequential calls after the first finishes', async () => {
  const guard = singleFlight();
  const results = [];
  const work = async (value) => guard(async () => { results.push(value); });
  await work(1);
  await work(2);
  assert.deepEqual(results, [1, 2]);
});

test('singleFlight releases lock after an error', async () => {
  const guard = singleFlight();
  let count = 0;
  try { await guard(async () => { count++; throw new Error('boom'); }); } catch { /* expected */ }
  await guard(async () => { count++; });
  assert.equal(count, 2);
});
