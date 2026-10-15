import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROLES, ALL_ROLES, hasAnyRole } from './roles.js';
import { handleAuthResponseError } from '../services/api.js';

test('AppRoutes strictly enforces Admin-only access on administrative routes', () => {
  const src = readFileSync(new URL('./AppRoutes.jsx', import.meta.url), 'utf8');
  const adminGroup = src.slice(src.indexOf('{/* Admin Protected Routes */}'), src.indexOf('{/* Kitchen Staff Protected Routes */}'));
  
  assert.match(adminGroup, /allowedRoles=\{\[ROLES\.ADMIN\]\}/);
  assert.doesNotMatch(adminGroup, /ROLES\.CUSTOMER|ROLES\.KITCHEN_STAFF/);
  assert.ok(adminGroup.includes('path="/admin"'));
  assert.ok(adminGroup.includes('path="/admin/users"'));
  assert.ok(adminGroup.includes('path="/admin/menu"'));
  assert.ok(adminGroup.includes('path="/admin/reservations"'));
  assert.ok(adminGroup.includes('path="/admin/reports/reservations"'));
  assert.ok(adminGroup.includes('path="/admin/feedback"'));
});

test('AppRoutes strictly enforces Kitchen-Staff access on kitchen queue routes', () => {
  const src = readFileSync(new URL('./AppRoutes.jsx', import.meta.url), 'utf8');
  const kitchenGroup = src.slice(src.indexOf('{/* Kitchen Staff Protected Routes */}'), src.indexOf('{/* Catch-all Fallback */}'));
  
  assert.match(kitchenGroup, /ROLES\.KITCHEN_STAFF/);
  assert.doesNotMatch(kitchenGroup, /ROLES\.CUSTOMER/);
  assert.ok(kitchenGroup.includes('path="/kitchen"'));
});

test('AppRoutes strictly separates customer reservation routes from staff access', () => {
  const src = readFileSync(new URL('./AppRoutes.jsx', import.meta.url), 'utf8');
  const reservationGroup = src.slice(src.indexOf('{/* Customer-only Reservation Routes */}'), src.indexOf('{/* Admin Protected Routes */}'));
  
  assert.match(reservationGroup, /allowedRoles=\{\[ROLES\.CUSTOMER\]\}/);
  assert.doesNotMatch(reservationGroup, /ROLES\.ADMIN|ROLES\.KITCHEN_STAFF/);
  assert.ok(reservationGroup.includes('path="/reservations/new"'));
  assert.ok(reservationGroup.includes('path="/reservations/history"'));
});

test('handleAuthResponseError purges storage and triggers auth:unauthorized on 401', async () => {
  let eventFired = false;
  const originalLocalStorage = global.localStorage;
  const originalWindow = global.window;

  const storageMock = {
    token: 'test-token',
    user: JSON.stringify({ email: 'test@bistro.com' }),
    removeItem(key) {
      delete this[key];
    }
  };

  global.localStorage = storageMock;
  global.window = {
    location: { pathname: '/portal', href: '/portal' },
    dispatchEvent(event) {
      if (event.type === 'auth:unauthorized') {
        eventFired = true;
      }
    }
  };
  global.Event = class {
    constructor(type) {
      this.type = type;
    }
  };

  try {
    await assert.rejects(
      handleAuthResponseError({ response: { status: 401 } }),
      (err) => err.response?.status === 401
    );

    assert.equal(storageMock.token, undefined);
    assert.equal(storageMock.user, undefined);
    assert.equal(eventFired, true);
    assert.equal(global.window.location.href, '/login');
  } finally {
    global.localStorage = originalLocalStorage;
    global.window = originalWindow;
  }
});

test('All service modules attach unified 401 error handler', () => {
  const tableServiceSrc = readFileSync(new URL('../services/tableService.js', import.meta.url), 'utf8');
  const menuServiceSrc = readFileSync(new URL('../services/menuService.js', import.meta.url), 'utf8');
  const orderServiceSrc = readFileSync(new URL('../services/orderService.js', import.meta.url), 'utf8');
  const feedbackServiceSrc = readFileSync(new URL('../services/feedbackService.js', import.meta.url), 'utf8');

  assert.match(tableServiceSrc, /reservationApi\.interceptors\.response\.use\(\s*\(response\)\s*=>\s*response,\s*handleAuthResponseError\s*\)/);
  assert.match(menuServiceSrc, /reservationApi\.interceptors\.response\.use\(\s*\(response\)\s*=>\s*response,\s*handleAuthResponseError\s*\)/);
  assert.match(orderServiceSrc, /orderApi\.interceptors\.response\.use\(\s*\(response\)\s*=>\s*response,\s*handleAuthResponseError\s*\)/);
  assert.match(feedbackServiceSrc, /feedbackApi\.interceptors\.response\.use\(\s*\(response\)\s*=>\s*response,\s*handleAuthResponseError\s*\)/);
});

test('AppRoutes strictly enforces Customer-only access on customer feedback route', () => {
  const src = readFileSync(new URL('./AppRoutes.jsx', import.meta.url), 'utf8');
  const feedbackSection = src.slice(src.indexOf('{/* Customer Order Cart - SR-132 */}'), src.indexOf('{/* Tables Route */}'));

  assert.match(feedbackSection, /allowedRoles=\{\[ROLES\.CUSTOMER\]\}/);
  assert.ok(feedbackSection.includes('path="/feedback"'));
});

