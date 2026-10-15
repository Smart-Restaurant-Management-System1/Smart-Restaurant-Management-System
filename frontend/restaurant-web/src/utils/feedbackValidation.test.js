import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedback, sanitizeFeedbackComment } from './feedbackValidation.js';

test('sanitizeFeedbackComment strips HTML and trims whitespace', () => {
  assert.equal(sanitizeFeedbackComment('  <b>Great!</b>  '), 'Great!');
  assert.equal(sanitizeFeedbackComment('<script>alert(1)</script>Tasty food'), 'alert(1)Tasty food');
  assert.equal(sanitizeFeedbackComment(null), '');
  assert.equal(sanitizeFeedbackComment(undefined), '');
});

test('validateFeedback succeeds with valid 5-star rating without comment', () => {
  const result = validateFeedback({ rating: 5, comment: '' });
  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('validateFeedback succeeds with valid 4-star rating and comment', () => {
  const result = validateFeedback({ rating: 4, comment: 'Nice wine selection' });
  assert.equal(result.isValid, true);
  assert.equal(result.sanitizedComment, 'Nice wine selection');
});

test('validateFeedback rejects missing, non-numeric, or out of range ratings', () => {
  assert.equal(validateFeedback({ rating: 0, comment: 'test' }).isValid, false);
  assert.equal(validateFeedback({ rating: 6, comment: 'test' }).isValid, false);
  assert.equal(validateFeedback({ rating: 3.5, comment: 'test' }).isValid, false);
  assert.equal(validateFeedback({ rating: 'bad', comment: 'test' }).isValid, false);
  assert.equal(validateFeedback({ rating: null, comment: 'test' }).isValid, false);
});

test('validateFeedback requires comment for ratings 1-3 with at least 5 chars', () => {
  const missingComment = validateFeedback({ rating: 2, comment: '' });
  assert.equal(missingComment.isValid, false);
  assert.ok(missingComment.errors.comment);

  const shortComment = validateFeedback({ rating: 1, comment: 'bad' });
  assert.equal(shortComment.isValid, false);
  assert.ok(shortComment.errors.comment.includes('at least 5 characters'));

  const validLow = validateFeedback({ rating: 3, comment: 'Service was slightly slow today' });
  assert.equal(validLow.isValid, true);
});

test('validateFeedback rejects comments exceeding 1000 characters', () => {
  const longComment = 'a'.repeat(1001);
  const result = validateFeedback({ rating: 5, comment: longComment });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.comment.includes('cannot exceed 1000 characters'));
});
