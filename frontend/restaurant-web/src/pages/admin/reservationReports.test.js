import test from 'node:test';
import assert from 'node:assert/strict';

function validateReportDateRange(from, to) {
  if (!from || !to) return null;
  if (from > to) return 'From date must not be later than To date.';
  const diffDays = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  if (diffDays > 91) return 'Date range cannot exceed 92 days.';
  return null;
}

function computeStatusDistribution(summary) {
  if (!summary) return [];
  return [
    { name: 'Confirmed', value: summary.confirmedReservations },
    { name: 'Pending', value: summary.pendingReservations },
    { name: 'Completed', value: summary.completedReservations },
    { name: 'Cancelled', value: summary.cancelledReservations },
  ].filter((item) => item.value > 0);
}

function resolveExportFilename(contentDisposition, defaultFilename) {
  if (!contentDisposition) return defaultFilename;
  const match = contentDisposition.match(/filename="?([^";]+)"?/);
  return match && match[1] ? match[1] : defaultFilename;
}

test('Report date filter: rejects range where from > to', () => {
  const error = validateReportDateRange('2026-09-20', '2026-09-10');
  assert.equal(error, 'From date must not be later than To date.');
});

test('Report date filter: rejects range exceeding 92 days', () => {
  const error = validateReportDateRange('2026-01-01', '2026-06-01');
  assert.equal(error, 'Date range cannot exceed 92 days.');
});

test('Report date filter: accepts valid range', () => {
  const error = validateReportDateRange('2026-09-01', '2026-09-30');
  assert.equal(error, null);
});

test('Report summary distribution: includes Confirmed, Pending, Completed, Cancelled', () => {
  const summary = {
    totalReservations: 10,
    confirmedReservations: 4,
    pendingReservations: 2,
    completedReservations: 3,
    cancelledReservations: 1,
    cancellationRate: 10.0,
  };
  const distribution = computeStatusDistribution(summary);
  assert.equal(distribution.length, 4);
  assert.deepEqual(distribution.map((d) => d.name), ['Confirmed', 'Pending', 'Completed', 'Cancelled']);
  assert.deepEqual(distribution.map((d) => d.value), [4, 2, 3, 1]);
});

test('Report summary distribution: filters out zero counts', () => {
  const summary = {
    totalReservations: 5,
    confirmedReservations: 5,
    pendingReservations: 0,
    completedReservations: 0,
    cancelledReservations: 0,
    cancellationRate: 0.0,
  };
  const distribution = computeStatusDistribution(summary);
  assert.equal(distribution.length, 1);
  assert.equal(distribution[0].name, 'Confirmed');
  assert.equal(distribution[0].value, 5);
});

test('Export filename resolution: extracts filename from Content-Disposition header', () => {
  const header = 'attachment; filename="reservation-report-2026-09-01-to-2026-09-30.xlsx"';
  const resolved = resolveExportFilename(header, 'fallback.xlsx');
  assert.equal(resolved, 'reservation-report-2026-09-01-to-2026-09-30.xlsx');
});

test('Export filename resolution: falls back when header is absent', () => {
  const resolved = resolveExportFilename(null, 'default-report.csv');
  assert.equal(resolved, 'default-report.csv');
});
