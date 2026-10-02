import test from 'node:test';
import assert from 'node:assert/strict';

// Helper tests for Admin feedback presentation logic and metrics
function calculateSatisfactionScore(distribution, total) {
  if (!total || total <= 0) return 0;
  const topReviews = (distribution?.[4] || 0) + (distribution?.[5] || 0);
  return Math.round((topReviews / total) * 100);
}

function formatSafeCustomerIdentifier(customerDisplayName, customerId) {
  if (customerDisplayName && customerDisplayName.trim()) {
    return customerDisplayName.trim();
  }
  return `Customer #${customerId}`;
}

function buildAdminFeedbackQueryParams({ page, pageSize, rating, fromDate, toDate, search }) {
  const params = {
    page: Math.max(1, page || 1),
    pageSize: Math.max(1, pageSize || 10),
  };

  if (rating) {
    const num = parseInt(rating, 10);
    if (num >= 1 && num <= 5) params.rating = num;
  }

  if (fromDate) params.fromDate = new Date(fromDate).toISOString();
  if (toDate) params.toDate = new Date(toDate + 'T23:59:59.999Z').toISOString();
  if (search && search.trim()) params.search = search.trim();

  return params;
}

test('calculateSatisfactionScore handles zero and positive totals accurately', () => {
  assert.equal(calculateSatisfactionScore({}, 0), 0);
  assert.equal(calculateSatisfactionScore({ 4: 10, 5: 15 }, 25), 100);
  assert.equal(calculateSatisfactionScore({ 1: 5, 2: 5, 4: 10, 5: 30 }, 50), 80);
});

test('formatSafeCustomerIdentifier avoids leaking raw sensitive personal attributes', () => {
  assert.equal(formatSafeCustomerIdentifier('Customer #42', 42), 'Customer #42');
  assert.equal(formatSafeCustomerIdentifier('', 99), 'Customer #99');
  assert.equal(formatSafeCustomerIdentifier(null, 105), 'Customer #105');
});

test('buildAdminFeedbackQueryParams constructs valid API filter query', () => {
  const query = buildAdminFeedbackQueryParams({
    page: 2,
    pageSize: 20,
    rating: '5',
    fromDate: '2026-10-01',
    toDate: '2026-10-02',
    search: '  wine  ',
  });

  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 20);
  assert.equal(query.rating, 5);
  assert.ok(query.fromDate.startsWith('2026-10-01'));
  assert.ok(query.toDate.startsWith('2026-10-02'));
  assert.equal(query.search, 'wine');
});

test('buildAdminFeedbackQueryParams ignores invalid ratings', () => {
  const query = buildAdminFeedbackQueryParams({
    page: 1,
    pageSize: 10,
    rating: '10',
  });

  assert.equal(query.rating, undefined);
});
