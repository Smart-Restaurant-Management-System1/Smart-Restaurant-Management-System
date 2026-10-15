import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getApiErrorMessage } from './apiErrorMessage.js';

const err = (status, message) => ({ response: { status, data: message ? { message } : {} } });

test('403 shows a friendly customer-only message, never the raw axios text', () => {
  const msg = getApiErrorMessage(
    Object.assign(new Error('Request failed with status code 403'), err(403)),
    'fallback'
  );
  assert.match(msg, /customer accounts only/i);
  assert.doesNotMatch(msg, /status code/i);
});

test('401 asks the user to sign in again', () => {
  assert.match(getApiErrorMessage(err(401), 'fallback'), /sign in again/i);
});

test('other errors keep the server message, then the fallback', () => {
  assert.equal(getApiErrorMessage(err(409, 'Item unavailable'), 'fallback'), 'Item unavailable');
  assert.equal(getApiErrorMessage(err(500), 'fallback'), 'fallback');
  assert.equal(getApiErrorMessage(new Error('network'), 'fallback'), 'fallback');
});

test('reservationApi attaches the stored token as a Bearer header', () => {
  const src = readFileSync(new URL('./menuService.js', import.meta.url), 'utf8');
  assert.match(src, /localStorage\.getItem\('token'\)/);
  assert.match(src, /Authorization = `Bearer \$\{token\}`/);
});
