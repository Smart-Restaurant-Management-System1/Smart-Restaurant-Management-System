import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavLinks, getDefaultDashboardPath, getRoleBadgeInfo } from './navConfig.js';
import { ROLES } from '../../routes/roles.js';

test('getNavLinks returns public navigation links when unauthenticated', () => {
  const linksLoggedOut = getNavLinks(null, false);
  assert.deepEqual(linksLoggedOut, [
    { label: 'Sign In', to: '/login' },
    { label: 'Register', to: '/register' },
  ]);

  const linksNoUser = getNavLinks(undefined, false);
  assert.deepEqual(linksNoUser, [
    { label: 'Sign In', to: '/login' },
    { label: 'Register', to: '/register' },
  ]);
});

test('getNavLinks returns Customer-specific links', () => {
  const customerUser = {
    username: 'alice',
    roles: [ROLES.CUSTOMER],
  };
  const links = getNavLinks(customerUser, true);

  assert.deepEqual(links, [
    { label: 'Dining Portal', to: '/portal' },
    { label: 'Reservations', to: '/reservations' },
  ]);
});

test('getNavLinks returns KitchenStaff-specific links', () => {
  const kitchenUser = {
    username: 'chef_gordon',
    roles: [ROLES.KITCHEN_STAFF],
  };
  const links = getNavLinks(kitchenUser, true);

  assert.deepEqual(links, [
    { label: 'Kitchen Queue', to: '/kitchen' },
  ]);
});

test('getNavLinks returns Admin-specific links', () => {
  const adminUser = {
    username: 'super_admin',
    roles: [ROLES.ADMIN],
  };
  const links = getNavLinks(adminUser, true);

  assert.deepEqual(links, [
    { label: 'Admin Dashboard', to: '/admin' },
    { label: 'Tables', to: '/admin/tables' },
  ]);
});

test('getDefaultDashboardPath resolves correct destination by role priority', () => {
  assert.equal(getDefaultDashboardPath(null, false), '/login');
  assert.equal(getDefaultDashboardPath({ roles: [ROLES.ADMIN] }, true), '/admin');
  assert.equal(getDefaultDashboardPath({ roles: [ROLES.KITCHEN_STAFF] }, true), '/kitchen');
  assert.equal(getDefaultDashboardPath({ roles: [ROLES.CUSTOMER] }, true), '/portal');
  assert.equal(getDefaultDashboardPath({ roles: [] }, true), '/portal');
});

test('getRoleBadgeInfo returns correct labels and styling for all roles', () => {
  const adminBadge = getRoleBadgeInfo([ROLES.ADMIN]);
  assert.equal(adminBadge.label, 'Admin');
  assert.equal(adminBadge.color, '#d4af37');

  const kitchenBadge = getRoleBadgeInfo([ROLES.KITCHEN_STAFF]);
  assert.equal(kitchenBadge.label, 'Kitchen Staff');
  assert.equal(kitchenBadge.color, '#fbbf24');

  const customerBadge = getRoleBadgeInfo([ROLES.CUSTOMER]);
  assert.equal(customerBadge.label, 'Customer');
  assert.equal(customerBadge.color, '#38bdf8');

  const fallbackBadge = getRoleBadgeInfo(['Manager']);
  assert.equal(fallbackBadge.label, 'Manager');
  assert.equal(fallbackBadge.color, '#9ca3af');
});
