import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard for a real production bug: Register.jsx's password-visibility
// "eye" icon had a truncated `d` attribute (an odd number of coordinate pairs after
// the `s` smooth-curve command), which Chrome/Firefox reported as
// `<path> attribute d: Expected number, "...11-8z"`. This test asserts the icon's
// path data stays byte-identical to the known-good version used in Login.jsx, and
// fails loudly (rather than passing trivially) if the icon is ever moved or removed.

const CANONICAL_EYE_PATH = 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z';

const here = dirname(fileURLToPath(import.meta.url));
const loginSource = readFileSync(join(here, 'Login.jsx'), 'utf8');
const registerSource = readFileSync(join(here, 'Register.jsx'), 'utf8');

function eyePathOccurrences(source) {
  const pattern = /<path d="(M1 12s[^"]*)"/g;
  const matches = [];
  let m;
  while ((m = pattern.exec(source)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

test('Login.jsx has exactly one password-eye icon, and it is well-formed', () => {
  const matches = eyePathOccurrences(loginSource);
  assert.equal(matches.length, 1, 'expected exactly one eye-icon path in Login.jsx — the icon may have moved or been removed');
  assert.equal(matches[0], CANONICAL_EYE_PATH);
});

test('Register.jsx has exactly two password-eye icons (password + confirm password), both well-formed', () => {
  const matches = eyePathOccurrences(registerSource);
  assert.equal(matches.length, 2, 'expected exactly two eye-icon paths in Register.jsx (password and confirm-password toggles) — an icon may have moved, been removed, or a duplicate was deleted');
  for (const path of matches) {
    assert.equal(path, CANONICAL_EYE_PATH);
  }
});

test('the canonical eye path has a valid (even) number of coordinate pairs after the smooth-curve command', () => {
  // `s` takes repeating (dx1,dy1 dx,dy) pairs. Truncating one number produces an
  // odd total, which is exactly the class of bug this test file exists to catch.
  const afterS = CANONICAL_EYE_PATH.slice(CANONICAL_EYE_PATH.indexOf('s') + 1, -1); // strip leading "s" and trailing "z"
  const numbers = afterS.match(/-?\d+(\.\d+)?/g) ?? [];
  assert.equal(numbers.length % 2, 0, `expected an even count of numbers after 's', got ${numbers.length}: ${numbers.join(',')}`);
});
