import test from 'node:test';
import assert from 'node:assert/strict';
import { getLandingActions, focusLandingAnchor } from '../../components/landing/landingNavigation.js';
import { landingLinks } from '../../components/landing/landingLinks.js';

// ── getLandingActions: label and route coverage ──────────────────────────────

test('Guest primary action label is Get Started', () => {
  const { primary } = getLandingActions({ isAuthenticated: false, user: null });
  assert.equal(primary.label, 'Get Started');
});

test('Guest secondary action label is Login', () => {
  const { secondary } = getLandingActions({ isAuthenticated: false, user: null });
  assert.equal(secondary.label, 'Login');
});

test('Guest booking action label is Book a Table', () => {
  const { booking } = getLandingActions({ isAuthenticated: false, user: null });
  assert.equal(booking.label, 'Book a Table');
});

test('Authenticated user with empty roles falls back to /portal', () => {
  const { primary, booking } = getLandingActions({ isAuthenticated: true, user: { roles: [] } });
  assert.equal(primary.to, '/portal');
  assert.equal(booking.to, '/portal');
});

test('Authenticated user with null user object falls back to /portal', () => {
  const { primary, booking } = getLandingActions({ isAuthenticated: true, user: null });
  assert.equal(primary.to, '/portal');
  assert.equal(booking.to, '/portal');
});

// ── landingLinks: static data contract ──────────────────────────────────────

test('Navigation link list has exactly five entries', () => {
  assert.equal(landingLinks.length, 5);
});

test('First navigation link is Home pointing to #home', () => {
  assert.deepEqual(landingLinks[0], ['Home', '#home']);
});

test('Last navigation link is Contact pointing to #contact', () => {
  assert.deepEqual(landingLinks[landingLinks.length - 1], ['Contact', '#contact']);
});

test('All navigation link hrefs start with a hash symbol', () => {
  assert.ok(landingLinks.every(([, href]) => href.startsWith('#')));
});

test('Navigation links cover all five required section anchors', () => {
  const hrefs = landingLinks.map(([, href]) => href);
  for (const required of ['#home', '#about', '#features', '#reservations', '#contact']) {
    assert.ok(hrefs.includes(required), `Missing required anchor ${required}`);
  }
});

// ── focusLandingAnchor: modifier-key and event guard behaviour ───────────────

function makeAnchorEvent(overrides = {}, anchorHref = '#about') {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: { closest: () => (anchorHref ? { getAttribute: () => anchorHref } : null) },
    preventDefault: () => {},
    ...overrides,
  };
}

function withDomGlobals(anchorHref, fn) {
  const mockTarget = {
    _tabSet: false,
    hasAttribute: (attr) => attr === 'tabindex' ? false : false,
    setAttribute: (attr) => { if (attr === 'tabindex') mockTarget._tabSet = true; },
    focus: () => {},
    scrollIntoView: () => {},
  };
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = { getElementById: (id) => (`#${id}` === anchorHref ? mockTarget : null) };
  globalThis.window = { history: { pushState: () => {} }, matchMedia: () => ({ matches: false }) };
  try {
    return fn(mockTarget);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
}

test('focusLandingAnchor returns early when event is already defaultPrevented', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ defaultPrevented: true, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early on non-primary mouse button', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ button: 2, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when metaKey is held', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ metaKey: true, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when ctrlKey is held', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ ctrlKey: true, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when shiftKey is held', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ shiftKey: true, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when altKey is held', () => {
  let called = false;
  focusLandingAnchor(makeAnchorEvent({ altKey: true, preventDefault: () => { called = true; } }));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when the clicked element is not inside a hash anchor', () => {
  let called = false;
  const event = makeAnchorEvent({ preventDefault: () => { called = true; } }, null);
  withDomGlobals('#about', () => focusLandingAnchor(event));
  assert.ok(!called);
});

test('focusLandingAnchor returns early when the target section does not exist in DOM', () => {
  let called = false;
  const event = makeAnchorEvent({ preventDefault: () => { called = true; } }, '#missing');
  withDomGlobals('#about', () => focusLandingAnchor(event));
  assert.ok(!called);
});

test('focusLandingAnchor prevents default, pushes history state, and focuses the target', () => {
  let prevented = false;
  let pushed = null;
  let focused = false;
  const event = {
    defaultPrevented: false, button: 0,
    metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    target: { closest: () => ({ getAttribute: () => '#about' }) },
    preventDefault: () => { prevented = true; },
  };
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = { getElementById: () => ({ hasAttribute: () => false, setAttribute: () => {}, focus: () => { focused = true; }, scrollIntoView: () => {} }) };
  globalThis.window = { history: { pushState: (s, t, url) => { pushed = url; } }, matchMedia: () => ({ matches: false }) };
  try {
    focusLandingAnchor(event);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
  assert.ok(prevented, 'Should call preventDefault');
  assert.equal(pushed, '#about', 'Should push the hash to history');
  assert.ok(focused, 'Should focus the target section');
});

test('focusLandingAnchor does not set tabindex when the element already has one', () => {
  let tabSet = false;
  const event = {
    defaultPrevented: false, button: 0,
    metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    target: { closest: () => ({ getAttribute: () => '#about' }) },
    preventDefault: () => {},
  };
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = { getElementById: () => ({ hasAttribute: (attr) => attr === 'tabindex', setAttribute: () => { tabSet = true; }, focus: () => {}, scrollIntoView: () => {} }) };
  globalThis.window = { history: { pushState: () => {} }, matchMedia: () => ({ matches: false }) };
  try {
    focusLandingAnchor(event);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
  assert.ok(!tabSet, 'Should not overwrite existing tabindex attribute');
});
