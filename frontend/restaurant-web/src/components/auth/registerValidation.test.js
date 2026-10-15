import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDisposableEmail,
  validateRegisterEmail,
  DISPOSABLE_EMAIL_DOMAINS,
} from './registerValidation.js';

test('isDisposableEmail identifies standard disposable email domains correctly (SR-296)', () => {
  assert.equal(isDisposableEmail('user@mailinator.com'), true);
  assert.equal(isDisposableEmail('guest@tempmail.com'), true);
  assert.equal(isDisposableEmail('test@10minutemail.com'), true);
  assert.equal(isDisposableEmail('bot@guerrillamail.com'), true);
  assert.equal(isDisposableEmail('fake@yopmail.com'), true);
  assert.equal(isDisposableEmail('spam@sharklasers.com'), true);
  assert.equal(isDisposableEmail('trash@dispostable.com'), true);
});

test('isDisposableEmail identifies subdomains of disposable services as disposable', () => {
  assert.equal(isDisposableEmail('user@box.mailinator.com'), true);
  assert.equal(isDisposableEmail('test@sub.yopmail.com'), true);
});

test('isDisposableEmail permits legitimate personal and enterprise email domains', () => {
  assert.equal(isDisposableEmail('kunchana@gmail.com'), false);
  assert.equal(isDisposableEmail('guest@yahoo.com'), false);
  assert.equal(isDisposableEmail('diner@outlook.com'), false);
  assert.equal(isDisposableEmail('admin@cinnamonbistro.com'), false);
  assert.equal(isDisposableEmail('contact@university.ac.lk'), false);
});

test('isDisposableEmail handles empty, null, and non-email strings safely without throwing', () => {
  assert.equal(isDisposableEmail(null), false);
  assert.equal(isDisposableEmail(undefined), false);
  assert.equal(isDisposableEmail(''), false);
  assert.equal(isDisposableEmail('plainstringwithoutat'), false);
});

test('validateRegisterEmail catches empty email', () => {
  assert.equal(validateRegisterEmail(''), 'Email address is required');
  assert.equal(validateRegisterEmail('   '), 'Email address is required');
  assert.equal(validateRegisterEmail(null), 'Email address is required');
});

test('validateRegisterEmail catches invalid email syntax', () => {
  assert.equal(validateRegisterEmail('plainaddress'), 'Please enter a valid email address');
  assert.equal(validateRegisterEmail('missingdomain@'), 'Please enter a valid email address');
  assert.equal(validateRegisterEmail('@nodomain.com'), 'Please enter a valid email address');
});

test('validateRegisterEmail rejects disposable email domains with explicit message (SR-296)', () => {
  const err = validateRegisterEmail('user@mailinator.com');
  assert.ok(err && err.includes('disposable'));
});

test('validateRegisterEmail passes for legitimate real email', () => {
  assert.equal(validateRegisterEmail('kunchana@gmail.com'), null);
  assert.equal(validateRegisterEmail('guest@outlook.com'), null);
});

test('DISPOSABLE_EMAIL_DOMAINS contains comprehensive domain set for robust protection', () => {
  assert.ok(DISPOSABLE_EMAIL_DOMAINS.size >= 25, 'Expected at least 25 common disposable domains in blocklist');
  assert.ok(DISPOSABLE_EMAIL_DOMAINS.has('mailinator.com'));
  assert.ok(DISPOSABLE_EMAIL_DOMAINS.has('tempmail.com'));
});

