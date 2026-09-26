import test from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyLocalUploadRef, resolveImageUrl } from './menuImageUrl.js';

const BLOB_URL =
  'https://stcinnamonbistrodev1848.blob.core.windows.net/menu-images/dish_0123456789abcdef0123456789abcdef.jpg';
const API_BASE = '/reservation-api'; // production VITE_RESERVATION_API_URL

test('an absolute HTTPS Blob URL is used unchanged (never rewritten to /reservation-api/uploads/...)', () => {
  assert.equal(resolveImageUrl(BLOB_URL, API_BASE), BLOB_URL);
  assert.equal(resolveImageUrl(BLOB_URL, 'http://localhost:5000/api'), BLOB_URL);
});

test('surrounding whitespace on a Blob URL is trimmed but the URL is otherwise unchanged', () => {
  assert.equal(resolveImageUrl(`  ${BLOB_URL}  `, API_BASE), BLOB_URL);
});

test('Paste URL: external http and https image URLs are returned unchanged', () => {
  assert.equal(resolveImageUrl('https://images.example.com/photos/kottu.jpg?w=400', API_BASE), 'https://images.example.com/photos/kottu.jpg?w=400');
  assert.equal(resolveImageUrl('http://cdn.example.com/a.png', API_BASE), 'http://cdn.example.com/a.png');
});

test('empty, missing and non-string references resolve to an empty string', () => {
  for (const value of ['', '   ', null, undefined, 42, {}]) {
    assert.equal(resolveImageUrl(value, API_BASE), '');
  }
});

test('legacy local references still resolve against the API origin (they were never served in production)', () => {
  assert.equal(resolveImageUrl('/uploads/menu-images/dish_old.jpg', API_BASE), '/reservation-api/uploads/menu-images/dish_old.jpg');
  assert.equal(resolveImageUrl('/uploads/menu-images/dish_old.jpg', 'http://localhost:5000/api'), 'http://localhost:5000/uploads/menu-images/dish_old.jpg');
});

test('legacy /uploads/... references are identifiable for manual re-upload', () => {
  assert.equal(isLegacyLocalUploadRef('/uploads/menu-images/dish_old.jpg'), true);
  assert.equal(isLegacyLocalUploadRef('uploads/menu-images/dish_old.jpg'), true);
  assert.equal(isLegacyLocalUploadRef('  /UPLOADS/menu-images/x.jpg '), true);
});

test('Blob URLs, pasted URLs and empty references are NOT flagged as legacy', () => {
  assert.equal(isLegacyLocalUploadRef(BLOB_URL), false);
  assert.equal(isLegacyLocalUploadRef('https://example.com/uploads/photo.jpg'), false);
  assert.equal(isLegacyLocalUploadRef(''), false);
  assert.equal(isLegacyLocalUploadRef(null), false);
  assert.equal(isLegacyLocalUploadRef(undefined), false);
});
