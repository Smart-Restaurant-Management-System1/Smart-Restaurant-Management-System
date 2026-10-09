import test from 'node:test';
import assert from 'node:assert/strict';

test('adminOrderService module exports expected API functions', async () => {
  const service = await import('./adminOrderService.js');
  assert.equal(typeof service.getAdminOrders, 'function');
  assert.equal(typeof service.exportAdminOrders, 'function');
});

