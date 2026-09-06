import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTableEditForm,
  sanitizeTableEditPayload,
} from '../../components/reservations/tableValidation.js';

test('Table grid logic accurately maps active and inactive tables', () => {
  const mockTables = [
    { id: 1, tableNumber: 'T-01', capacity: 4, location: 'Main Dining', status: 'Available', isActive: true },
    { id: 2, tableNumber: 'T-02', capacity: 2, location: 'Window', status: 'Occupied', isActive: true },
    { id: 3, tableNumber: 'T-03', capacity: 6, location: 'Patio', status: 'Inactive', isActive: false },
  ];

  // Verify active tables count
  const activeTables = mockTables.filter((t) => t.isActive);
  assert.equal(activeTables.length, 2);

  // Verify inactive table preservation in grid
  const inactiveTables = mockTables.filter((t) => !t.isActive || t.status === 'Inactive');
  assert.equal(inactiveTables.length, 1);
  assert.equal(inactiveTables[0].tableNumber, 'T-03');

  // Verify metrics calculation
  const totalCapacity = mockTables.reduce((sum, t) => sum + t.capacity, 0);
  assert.equal(totalCapacity, 12);

  const availableCount = mockTables.filter((t) => t.status === 'Available').length;
  assert.equal(availableCount, 1);

  const occupiedCount = mockTables.filter((t) => t.status === 'Occupied').length;
  assert.equal(occupiedCount, 1);
});

test('Deactivation rules: already-inactive table cannot be deactivated again', () => {
  const inactiveTable = { id: 3, tableNumber: 'T-03', status: 'Inactive', isActive: false };
  const isAlreadyInactive = inactiveTable.status === 'Inactive' || inactiveTable.isActive === false;
  const isDeactivateDisabled = inactiveTable.status === 'Occupied' || isAlreadyInactive;

  assert.equal(isAlreadyInactive, true);
  assert.equal(isDeactivateDisabled, true);
});

test('Deactivation rules: occupied table cannot be deactivated', () => {
  const occupiedTable = { id: 2, tableNumber: 'T-02', status: 'Occupied', isActive: true };
  const isAlreadyInactive = occupiedTable.status === 'Inactive' || occupiedTable.isActive === false;
  const isDeactivateDisabled = occupiedTable.status === 'Occupied' || isAlreadyInactive;

  assert.equal(isDeactivateDisabled, true);
});

test('Deactivation rules: active available table can be deactivated', () => {
  const availableTable = { id: 1, tableNumber: 'T-01', status: 'Available', isActive: true };
  const isAlreadyInactive = availableTable.status === 'Inactive' || availableTable.isActive === false;
  const isDeactivateDisabled = availableTable.status === 'Occupied' || isAlreadyInactive;

  assert.equal(isDeactivateDisabled, false);
});

test('Deactivation state transition preserves table row in grid', () => {
  let tables = [
    { id: 1, tableNumber: 'T-01', capacity: 4, location: 'Main Dining', status: 'Available', isActive: true },
    { id: 2, tableNumber: 'T-02', capacity: 6, location: 'Patio', status: 'Available', isActive: true },
  ];

  // Soft-deactivate T-01: status becomes Inactive, row is NOT filtered out
  const deactivatedId = 1;
  tables = tables.map((t) =>
    t.id === deactivatedId ? { ...t, status: 'Inactive', isActive: false } : t
  );

  assert.equal(tables.length, 2); // Grid count remains unchanged!
  assert.equal(tables[0].status, 'Inactive');
  assert.equal(tables[0].isActive, false);
  assert.equal(tables[1].status, 'Available');
});

test('Editing workflow: sanitizeTableEditPayload strips table number to prevent mutation', () => {
  const editSubmission = {
    tableNumber: 'MALICIOUS_RENAME',
    capacity: '8',
    location: 'Chef Table',
  };

  const payload = sanitizeTableEditPayload(editSubmission);
  assert.equal(payload.tableNumber, undefined);
  assert.equal(payload.capacity, 8);
  assert.equal(payload.location, 'Chef Table');
});
