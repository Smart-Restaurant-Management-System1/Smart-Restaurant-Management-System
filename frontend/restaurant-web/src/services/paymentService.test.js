import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPayHereCheckout,
  requestCashPayment,
  submitBankTransferSlip,
  getPaymentStatus,
  getPendingVerifications,
  verifyPayment,
  launchPayHereHostedCheckout,
} from './paymentService.js';

test('paymentService exports all required payment methods', () => {
  assert.equal(typeof createPayHereCheckout, 'function');
  assert.equal(typeof requestCashPayment, 'function');
  assert.equal(typeof submitBankTransferSlip, 'function');
  assert.equal(typeof getPaymentStatus, 'function');
  assert.equal(typeof getPendingVerifications, 'function');
  assert.equal(typeof verifyPayment, 'function');
  assert.equal(typeof launchPayHereHostedCheckout, 'function');
});

test('launchPayHereHostedCheckout validates checkout data argument', () => {
  assert.throws(() => launchPayHereHostedCheckout(null), /Invalid checkout data/);
  assert.throws(() => launchPayHereHostedCheckout({}), /Invalid checkout data/);
});

test('launchPayHereHostedCheckout creates and submits form in DOM when document is available', () => {
  let submitted = false;
  let formAction = '';
  let formMethod = '';
  const fields = {};

  const fakeForm = {
    method: '',
    action: '',
    style: {},
    appendChild: (input) => {
      fields[input.name] = input.value;
    },
    submit: () => {
      submitted = true;
    },
  };

  const fakeDocument = {
    createElement: (tag) => {
      if (tag === 'form') return fakeForm;
      return { type: '', name: '', value: '' };
    },
    body: {
      appendChild: (el) => {
        formAction = el.action;
        formMethod = el.method;
      },
      removeChild: () => {},
      contains: () => true,
    },
  };

  const originalDocument = globalThis.document;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.document = fakeDocument;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    const checkoutData = {
      checkoutUrl: 'https://sandbox.payhere.lk/pay/checkout',
      merchantId: '1211149',
      merchantOrderReference: 'PAY-DIN-000005-AB12CD',
      orderType: 'DineIn',
      orderId: 5,
      amount: 4500,
      currency: 'LKR',
      hash: 'AABBCCDDEEFF00112233',
      notifyUrl: 'http://localhost:5000/api/payments/payhere/notify',
      returnUrl: 'http://localhost/orders?payment=returned',
      cancelUrl: 'http://localhost/orders?payment=cancelled',
    };

    launchPayHereHostedCheckout(checkoutData);

    assert.equal(submitted, true);
    assert.equal(formMethod, 'POST');
    assert.equal(formAction, 'https://sandbox.payhere.lk/pay/checkout');
    assert.equal(fields.merchant_id, '1211149');
    assert.equal(fields.order_id, 'PAY-DIN-000005-AB12CD');
    assert.equal(fields.amount, '4500.00');
    assert.equal(fields.currency, 'LKR');
    assert.equal(fields.hash, 'AABBCCDDEEFF00112233');
    assert.equal(fields.notify_url, 'http://localhost:5000/api/payments/payhere/notify');
    assert.equal(fields.return_url, 'http://localhost/orders?payment=returned');
    assert.equal(fields.cancel_url, 'http://localhost/orders?payment=cancelled');
  } finally {
    globalThis.document = originalDocument;
    globalThis.setTimeout = originalSetTimeout;
  }
});
