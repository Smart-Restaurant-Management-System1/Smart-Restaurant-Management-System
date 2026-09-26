import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostLoginPath, getDefaultPathForRoles } from './postLoginRedirect.js';
import { ROLES } from './roles.js';

const ADMIN = [ROLES.ADMIN];
const KITCHEN = [ROLES.KITCHEN_STAFF];
const CUSTOMER = [ROLES.CUSTOMER];

test('Admin + remembered customer-only path -> Admin dashboard', () => {
  for (const p of ['/menu', '/orders', '/order-review', '/cart', '/reservation-pre-order', '/reservations/history', '/orders/12']) {
    assert.equal(resolvePostLoginPath(ADMIN, p), '/admin', p);
  }
});

test('KitchenStaff + remembered unauthorized Customer/Admin route -> Kitchen', () => {
  for (const p of ['/menu', '/orders', '/order-review', '/cart', '/admin', '/admin/menu', '/portal']) {
    assert.equal(resolvePostLoginPath(KITCHEN, p), '/kitchen', p);
  }
});

test('Customer + authorized remembered route -> remembered route', () => {
  for (const p of ['/menu', '/orders', '/order-review', '/cart', '/reservations/history', '/availability', '/profile']) {
    assert.equal(resolvePostLoginPath(CUSTOMER, p), p, p);
  }
});

test('Customer is never sent to admin, kitchen, login, register or unauthorized', () => {
  for (const p of ['/admin', '/admin/menu', '/kitchen', '/login', '/register', '/unauthorized']) {
    assert.equal(resolvePostLoginPath(CUSTOMER, p), '/portal', p);
  }
});

test('external or malformed remembered URLs fall back to the role default', () => {
  const bad = ['https://evil.example/x', 'http://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'menu', '', null, undefined, 42, '/x\r\n'];
  for (const p of bad) {
    assert.equal(resolvePostLoginPath(ADMIN, p), '/admin', String(p));
    assert.equal(resolvePostLoginPath(KITCHEN, p), '/kitchen', String(p));
    assert.equal(resolvePostLoginPath(CUSTOMER, p), '/portal', String(p));
  }
});

test('existing normal login redirects are unchanged', () => {
  assert.equal(resolvePostLoginPath(ADMIN, undefined), '/admin');
  assert.equal(resolvePostLoginPath(KITCHEN, undefined), '/kitchen');
  assert.equal(resolvePostLoginPath(CUSTOMER, undefined), '/portal');
  assert.equal(resolvePostLoginPath([], undefined), '/portal');
  // Admin keeps admin/shared destinations; Kitchen keeps /kitchen and /tables.
  assert.equal(resolvePostLoginPath(ADMIN, '/admin/menu'), '/admin/menu');
  assert.equal(resolvePostLoginPath(ADMIN, '/admin/reservations'), '/admin/reservations');
  assert.equal(resolvePostLoginPath(ADMIN, '/availability'), '/availability');
  assert.equal(resolvePostLoginPath(ADMIN, '/kitchen'), '/admin');
  assert.equal(resolvePostLoginPath(KITCHEN, '/kitchen'), '/kitchen');
  assert.equal(resolvePostLoginPath(KITCHEN, '/tables'), '/tables');
  assert.equal(getDefaultPathForRoles(ADMIN), '/admin');
});

test('/admin/menu is not mistaken for the customer /menu route', () => {
  assert.equal(resolvePostLoginPath(ADMIN, '/admin/menu'), '/admin/menu');
});
