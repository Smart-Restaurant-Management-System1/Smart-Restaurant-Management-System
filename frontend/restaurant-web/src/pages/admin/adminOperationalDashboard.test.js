import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDashboardDateRange,
  getDatePreset
} from '../../services/adminDashboardService.js';

function mergeDailyTrends(reservationTrends = [], orderTrends = []) {
  const dateMap = new Map();

  reservationTrends.forEach((r) => {
    dateMap.set(r.date, {
      date: r.date,
      reservations: r.reservationsCount || 0,
      orders: 0
    });
  });

  orderTrends.forEach((o) => {
    if (dateMap.has(o.date)) {
      dateMap.get(o.date).orders = o.ordersCount || 0;
    } else {
      dateMap.set(o.date, {
        date: o.date,
        reservations: 0,
        orders: o.ordersCount || 0
      });
    }
  });

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateMenuAvailabilityRate(availableItems, totalItems) {
  if (!totalItems || totalItems <= 0) return 0;
  return Number(((availableItems / totalItems) * 100).toFixed(1));
}

test('mergeDailyTrends: combines reservations and orders on matching dates', () => {
  const res = [
    { date: '2026-10-01', reservationsCount: 5 },
    { date: '2026-10-02', reservationsCount: 8 }
  ];
  const ord = [
    { date: '2026-10-01', ordersCount: 12 },
    { date: '2026-10-02', ordersCount: 15 }
  ];

  const merged = mergeDailyTrends(res, ord);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0], { date: '2026-10-01', reservations: 5, orders: 12 });
  assert.deepEqual(merged[1], { date: '2026-10-02', reservations: 8, orders: 15 });
});

test('mergeDailyTrends: handles disjoint dates and fills zero counts', () => {
  const res = [{ date: '2026-10-01', reservationsCount: 4 }];
  const ord = [{ date: '2026-10-03', ordersCount: 7 }];

  const merged = mergeDailyTrends(res, ord);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0], { date: '2026-10-01', reservations: 4, orders: 0 });
  assert.deepEqual(merged[1], { date: '2026-10-03', reservations: 0, orders: 7 });
});

test('mergeDailyTrends: sorts merged results chronologically', () => {
  const res = [{ date: '2026-10-05', reservationsCount: 3 }];
  const ord = [{ date: '2026-10-01', ordersCount: 2 }];

  const merged = mergeDailyTrends(res, ord);
  assert.equal(merged[0].date, '2026-10-01');
  assert.equal(merged[1].date, '2026-10-05');
});

test('calculateMenuAvailabilityRate: returns correct percentage and handles zero total', () => {
  assert.equal(calculateMenuAvailabilityRate(18, 20), 90.0);
  assert.equal(calculateMenuAvailabilityRate(1, 3), 33.3);
  assert.equal(calculateMenuAvailabilityRate(0, 10), 0.0);
  assert.equal(calculateMenuAvailabilityRate(0, 0), 0.0);
});

test('validateDashboardDateRange: accepts same day range (e.g. today)', () => {
  const result = validateDashboardDateRange('2026-10-09', '2026-10-09');
  assert.equal(result, null);
});

test('validateDashboardDateRange: rejects reverse date range', () => {
  const result = validateDashboardDateRange('2026-10-10', '2026-10-09');
  assert.equal(result, 'From date must not be later than To date.');
});

