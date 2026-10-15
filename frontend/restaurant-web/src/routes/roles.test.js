import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, hasAnyRole } from './roles.js';

test('ROLES defines canonical role constants', () => {
  assert.equal(ROLES.ADMIN, 'Admin');
  assert.equal(ROLES.CUSTOMER, 'Customer');
  assert.equal(ROLES.KITCHEN_STAFF, 'KitchenStaff');
});

test('hasAnyRole returns false when user is unauthenticated (null)', () => {
  assert.equal(hasAnyRole(null, [ROLES.ADMIN]), false);
  assert.equal(hasAnyRole(undefined, [ROLES.CUSTOMER]), false);
});

test('hasAnyRole returns true when no specific roles are required', () => {
  const user = { email: 'guest@bistro.com', roles: [ROLES.CUSTOMER] };
  assert.equal(hasAnyRole(user, []), true);
});

test('hasAnyRole allows permitted roles to access protected content', () => {
  const adminUser = { email: 'admin@bistro.com', roles: [ROLES.ADMIN] };
  const customerUser = { email: 'customer@bistro.com', roles: [ROLES.CUSTOMER] };
  const kitchenUser = { email: 'chef@bistro.com', roles: [ROLES.KITCHEN_STAFF] };

  assert.equal(hasAnyRole(adminUser, [ROLES.ADMIN]), true);
  assert.equal(hasAnyRole(customerUser, [ROLES.CUSTOMER]), true);
  assert.equal(hasAnyRole(kitchenUser, [ROLES.KITCHEN_STAFF]), true);
});

test('hasAnyRole blocks authenticated wrong-role users', () => {
  const customerUser = { email: 'customer@bistro.com', roles: [ROLES.CUSTOMER] };
  const kitchenUser = { email: 'chef@bistro.com', roles: [ROLES.KITCHEN_STAFF] };

  // Customer cannot access Admin or KitchenStaff
  assert.equal(hasAnyRole(customerUser, [ROLES.ADMIN]), false);
  assert.equal(hasAnyRole(customerUser, [ROLES.KITCHEN_STAFF]), false);

  // KitchenStaff cannot access Admin
  assert.equal(hasAnyRole(kitchenUser, [ROLES.ADMIN]), false);
});

test('hasAnyRole supports multiple allowed roles', () => {
  const adminUser = { email: 'admin@bistro.com', roles: [ROLES.ADMIN] };
  const kitchenUser = { email: 'chef@bistro.com', roles: [ROLES.KITCHEN_STAFF] };
  const customerUser = { email: 'customer@bistro.com', roles: [ROLES.CUSTOMER] };

  const staffOnly = [ROLES.ADMIN, ROLES.KITCHEN_STAFF];

  assert.equal(hasAnyRole(adminUser, staffOnly), true);
  assert.equal(hasAnyRole(kitchenUser, staffOnly), true);
  assert.equal(hasAnyRole(customerUser, staffOnly), false);
});

test('customer ordering pages are Customer-only: Admin and KitchenStaff are not allowed', async () => {
  const { CUSTOMER_ORDERING_ROLES } = await import('./roles.js');
  assert.equal(hasAnyRole({ roles: [ROLES.CUSTOMER] }, CUSTOMER_ORDERING_ROLES), true);
  assert.equal(hasAnyRole({ roles: [ROLES.ADMIN] }, CUSTOMER_ORDERING_ROLES), false);
  assert.equal(hasAnyRole({ roles: [ROLES.KITCHEN_STAFF] }, CUSTOMER_ORDERING_ROLES), false);
});

test('AppRoutes only exposes cart-backed pages through the Customer-only guard', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./AppRoutes.jsx', import.meta.url), 'utf8');
  // Split into <Route element={<ProtectedRoute ...>} groups and find the guard that precedes each path.
  const groups = src.split(/<ProtectedRoute/).slice(1);
  for (const path of ['/orders', '/menu', '/order-review', '/cart', '/reservation-pre-order']) {
    const g = groups.find((x) => x.includes(`path="${path}"`));
    assert.ok(g, `route ${path} not found`);
    const guard = g.slice(0, g.indexOf('</ProtectedRoute>'));
    assert.doesNotMatch(guard, /ROLES\.ADMIN|ROLES\.KITCHEN_STAFF|ALL_ROLES/, `${path} must not allow Admin/Kitchen`);
  }
});
