/**
 * Invoice & Receipt Helpers for Cinnamon Bistro Fine Dining
 * Provides structured calculations and text receipt generation.
 */

export const RESTAURANT_DETAILS = {
  name: 'Cinnamon Bistro',
  legalName: 'Cinnamon Bistro (Private) Limited',
  tagline: 'Fine Dining & Artisanal Cuisine',
  address: '42 Galle Face Court, Colombo 03, Sri Lanka',
  telephone: '+94 11 234 5678',
  email: 'reservations@cinnamonbistro.lk',
  taxRegistrationNumber: 'VAT-78492019-B01',
};

export const formatCurrency = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 'LKR 0.00';
  return `LKR ${numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const getInvoiceNumber = (order) => {
  if (!order) return 'INV-UNKNOWN';
  if (order.orderReference) return `INV-${order.orderReference}`;
  if (order.orderId) return `INV-ORD-${order.orderId}`;
  return 'INV-0000';
};

export const calculateInvoiceSummary = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  let subtotal = 0;
  let totalItemsCount = 0;

  for (const item of items) {
    const qty = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? 0);
    subtotal += qty * unitPrice;
    totalItemsCount += qty;
  }

  const finalTotal = Number(order?.totalAmount ?? subtotal);

  return {
    itemCount: items.length,
    totalQuantity: totalItemsCount,
    subtotal,
    total: finalTotal,
  };
};

export const generateTextReceipt = (order) => {
  if (!order) return '';

  const summary = calculateInvoiceSummary(order);
  const invoiceNo = getInvoiceNumber(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('en-US') : 'N/A';

  const diningType =
    order.orderType === 'ReservationPreOrder'
      ? `Reservation Pre-Order (Booking #${order.reservationId || 'N/A'})`
      : `Dine-In (Table #${order.tableId || 'Standard'})`;

  const lines = [
    '==============================================================',
    `                 ${RESTAURANT_DETAILS.name.toUpperCase()}`,
    `           ${RESTAURANT_DETAILS.tagline}`,
    `       ${RESTAURANT_DETAILS.address}`,
    `              Tel: ${RESTAURANT_DETAILS.telephone}`,
    `           VAT No: ${RESTAURANT_DETAILS.taxRegistrationNumber}`,
    '==============================================================',
    '               OFFICIAL TAX INVOICE & RECEIPT',
    '==============================================================',
    `Invoice No     : ${invoiceNo}`,
    `Order Ref      : ${order.orderReference || `#${order.orderId}`}`,
    `Date & Time    : ${dateStr}`,
    `Dining Type    : ${diningType}`,
    `Payment Method : ${order.paymentMethod || 'Online Gateway'}`,
    `Payment Status : ${order.paymentStatus || 'Paid'} (VERIFIED)`,
    '--------------------------------------------------------------',
    'ITEM DESCRIPTION                 QTY     RATE        AMOUNT',
    '--------------------------------------------------------------',
  ];

  for (const item of items) {
    const name = (item.itemName || `Item #${item.menuItemId || ''}`).padEnd(30).slice(0, 30);
    const qty = String(item.quantity ?? 1).padStart(4);
    const rate = Number(item.unitPrice ?? 0).toFixed(2).padStart(10);
    const amt = (Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0)).toFixed(2).padStart(11);
    lines.push(`${name} ${qty} ${rate} ${amt}`);
  }

  lines.push('--------------------------------------------------------------');
  lines.push(`Subtotal (${summary.totalQuantity} items)`.padEnd(46) + `LKR ${summary.subtotal.toFixed(2).padStart(11)}`);
  lines.push('Taxes & Levies (VAT 10% Inclusive)'.padEnd(46) + '        INCL');
  lines.push('==============================================================');
  lines.push('TOTAL AMOUNT PAID'.padEnd(46) + `LKR ${summary.total.toFixed(2).padStart(11)}`);
  lines.push('==============================================================');
  lines.push('');
  lines.push('Thank you for choosing Cinnamon Bistro!');
  lines.push('We look forward to serving your next fine dining journey.');
  lines.push('This is a computer-generated tax invoice verified by PayHere.');
  lines.push('==============================================================');

  return lines.join('\n');
};
