import assert from 'node:assert/strict';
import test from 'node:test';
import { getActiveTablesView, tableCardLabel } from './activeTablesView.js';

test('active tables view shows loading, error, and empty states explicitly', () => {
  assert.equal(getActiveTablesView({ loading: true, error: '', tables: [] }), 'loading');
  assert.equal(getActiveTablesView({ loading: false, error: 'Request failed', tables: [] }), 'error');
  assert.equal(getActiveTablesView({ loading: false, error: '', tables: [] }), 'empty');
});

test('active tables view renders a card grid when tables are returned', () => {
  const tables = [{ tableId: 1, tableNumber: 'T-01', seatingCapacity: 4, operationalStatus: 'Available' }];
  assert.equal(getActiveTablesView({ loading: false, error: '', tables }), 'ready');
  assert.equal(tableCardLabel(tables[0]), 'Table T-01 - 4 seats');
});
