import test from 'node:test';
import assert from 'node:assert/strict';
import { getLandingActions } from './landingNavigation.js';

test('Guests use the existing login and registration flows until booking is available', () => {
  const actions = getLandingActions({ isAuthenticated: false, user: null });
  assert.equal(actions.primary.to, '/register');
  assert.equal(actions.secondary.to, '/login');
  assert.equal(actions.booking.to, '/register');
});

for (const [roles, destination] of [[['Customer'], '/portal'], [['Admin'], '/admin'], [['KitchenStaff'], '/kitchen'], [['Admin', 'Customer'], '/admin']]) {
  test(`Signed-in ${roles.join('/')} actions lead to ${destination} without registration prompts`, () => {
    const actions = getLandingActions({ isAuthenticated: true, user: { roles } });
    assert.equal(actions.primary.to, destination);
    assert.equal(actions.booking.to, destination);
    assert.equal(actions.secondary, null);
  });
}
