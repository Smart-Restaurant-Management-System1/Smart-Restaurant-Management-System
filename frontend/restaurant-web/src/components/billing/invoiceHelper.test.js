import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  getInvoiceNumber,
  calculateInvoiceSummary,
  generateTextReceipt,
  RESTAURANT_DETAILS,
} from './invoiceHelper.js';

test('formatCurrency formats numbers to LKR standard', () => {
  assert.equal(formatCurrency(0), 'LKR 0.00');
  assert.equal(formatCurrency(1500), 'LKR 1,500.00');
  assert.equal(formatCurrency(2450.75), 'LKR 2,450.75');
  assert.equal(formatCurrency(null), 'LKR 0.00');
  assert.equal(formatCurrency(undefined), 'LKR 0.00');
  assert.equal(formatCurrency('invalid'), 'LKR 0.00');
});

test('getInvoiceNumber returns prefixed reference or fallback', () => {
  assert.equal(
    getInvoiceNumber({ orderReference: 'ORD-20261004-9871' }),
    'INV-ORD-20261004-9871'
  );
  assert.equal(getInvoiceNumber({ orderId: 42 }), 'INV-ORD-42');
  assert.equal(getInvoiceNumber(null), 'INV-UNKNOWN');
});

test('calculateInvoiceSummary accurately sums quantities and amounts', () => {
  const sampleOrder = {
    totalAmount: 4800,
    items: [
      { menuItemId: 1, quantity: 2, unitPrice: 1500 },
      { menuItemId: 2, quantity: 1, unitPrice: 1800 },
    ],
  };

  const summary = calculateInvoiceSummary(sampleOrder);
  assert.equal(summary.itemCount, 2);
  assert.equal(summary.totalQuantity, 3);
  assert.equal(summary.subtotal, 4800);
  assert.equal(summary.total, 4800);
});

test('calculateInvoiceSummary handles missing or empty items safely', () => {
  const summary = calculateInvoiceSummary({ totalAmount: 2500 });
  assert.equal(summary.itemCount, 0);
  assert.equal(summary.totalQuantity, 0);
  assert.equal(summary.subtotal, 0);
  assert.equal(summary.total, 2500);
});

test('generateTextReceipt produces compliant branded receipt', () => {
  const sampleOrder = {
    orderId: 101,
    orderReference: 'ORD-20261004-101',
    orderType: 'DineIn',
    tableId: 5,
    createdAt: '2026-10-04T12:30:00Z',
    paymentMethod: 'PayHere',
    paymentStatus: 'Succeeded',
    totalAmount: 3200,
    items: [
      { itemName: 'Artisanal Beef Tenderloin', quantity: 1, unitPrice: 3200 },
    ],
  };

  const receipt = generateTextReceipt(sampleOrder);
  assert.ok(receipt.includes('CINNAMON BISTRO'));
  assert.ok(receipt.includes(RESTAURANT_DETAILS.taxRegistrationNumber));
  assert.ok(receipt.includes('INV-ORD-20261004-101'));
  assert.ok(receipt.includes('Table #5'));
  assert.ok(receipt.includes('Artisanal Beef Tenderloin'));
  assert.ok(receipt.includes('3200.00'));
});
