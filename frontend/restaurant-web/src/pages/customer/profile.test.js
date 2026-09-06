import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProfileForm,
  sanitizeProfilePayload,
  formatProfileForForm,
} from './profileValidation.js';

test('validateProfileForm succeeds with valid customer profile data', () => {
  const data = {
    fullName: 'Jane Doe',
    email: 'jane@bistro.com',
    phoneNumber: '+1-555-123456',
  };

  const result = validateProfileForm(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('validateProfileForm flags missing or empty required fields', () => {
  const data = {
    fullName: '   ',
    email: '',
    phoneNumber: '',
  };

  const result = validateProfileForm(data);
  assert.equal(result.isValid, false);
  assert.equal(result.errors.fullName, 'Full name is required');
  assert.equal(result.errors.email, 'Email address is required');
});

test('validateProfileForm catches invalid email format', () => {
  const data = {
    fullName: 'Jane Doe',
    email: 'not-an-email',
    phoneNumber: '',
  };

  const result = validateProfileForm(data);
  assert.equal(result.isValid, false);
  assert.equal(result.errors.email, 'Please enter a valid email address');
});

test('validateProfileForm catches invalid phone number format', () => {
  const data = {
    fullName: 'Jane Doe',
    email: 'jane@bistro.com',
    phoneNumber: 'abc-def-invalid',
  };

  const result = validateProfileForm(data);
  assert.equal(result.isValid, false);
  assert.equal(result.errors.phoneNumber, 'Please enter a valid phone number format');
});

test('sanitizeProfilePayload strips all protected fields and trims values', () => {
  const unvalidatedInput = {
    userId: 123,
    role: 'Admin',
    roles: ['Admin', 'SuperUser'],
    password: 'MaliciousPasswordChange',
    passwordHash: 'hash',
    isActive: false,
    createdAt: '2020-01-01',
    fullName: '  Jane Doe  ',
    email: '  Jane.Doe@Bistro.COM  ',
    phoneNumber: '  +1234567890  ',
  };

  const sanitized = sanitizeProfilePayload(unvalidatedInput);

  assert.deepEqual(sanitized, {
    fullName: 'Jane Doe',
    email: 'jane.doe@bistro.com',
    phoneNumber: '+1234567890',
  });

  // Verify protected fields are completely stripped
  assert.equal(sanitized.userId, undefined);
  assert.equal(sanitized.role, undefined);
  assert.equal(sanitized.roles, undefined);
  assert.equal(sanitized.password, undefined);
  assert.equal(sanitized.isActive, undefined);
  assert.equal(sanitized.createdAt, undefined);
});

test('formatProfileForForm pre-fills form correctly from backend response and handles nulls', () => {
  const backendResponse = {
    userId: 42,
    fullName: 'John Customer',
    email: 'john@example.com',
    phoneNumber: null,
    isActive: true,
    roles: ['Customer'],
  };

  const formState = formatProfileForForm(backendResponse);

  assert.equal(formState.fullName, 'John Customer');
  assert.equal(formState.email, 'john@example.com');
  assert.equal(formState.phoneNumber, '');
});

test('formatProfileForForm handles null backend payload safely', () => {
  const formState = formatProfileForForm(null);

  assert.equal(formState.fullName, '');
  assert.equal(formState.email, '');
  assert.equal(formState.phoneNumber, '');
});
