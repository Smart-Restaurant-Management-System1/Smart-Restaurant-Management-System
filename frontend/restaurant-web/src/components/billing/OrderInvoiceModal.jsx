import React, { useEffect, useMemo } from 'react';
import {
  RESTAURANT_DETAILS,
  formatCurrency,
  getInvoiceNumber,
  calculateInvoiceSummary,
  generateTextReceipt,
} from './invoiceHelper';
import './orderInvoiceModal.css';

export default function OrderInvoiceModal({ isOpen, onClose, order }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const summary = useMemo(() => calculateInvoiceSummary(order), [order]);

  if (!isOpen || !order) return null;

  const invoiceNumber = getInvoiceNumber(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const dateFormatted = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const diningType =
    order.orderType === 'ReservationPreOrder'
      ? `Reservation Pre-Order (Booking #${order.reservationId || 'N/A'})`
      : `Dine-In Table #${order.tableId || 'General'}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const text = generateTextReceipt(order);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CinnamonBistro_${invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="invoice-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div className="invoice-modal-dialog">
        {/* On-Screen Action Bar */}
        <div className="invoice-modal-header-bar">
          <h3 id="invoice-modal-title" className="invoice-header-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a87942"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Tax Invoice & Dining Receipt
          </h3>

          <div className="invoice-header-actions">
            <button
              type="button"
              className="invoice-action-btn-print"
              onClick={handlePrint}
              title="Print receipt or save directly as PDF"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / Save as PDF
            </button>

            <button
              type="button"
              className="invoice-action-btn-download"
              onClick={handleDownloadTxt}
              title="Download text file receipt"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export TXT
            </button>

            <button
              type="button"
              className="invoice-modal-close-btn"
              onClick={onClose}
              aria-label="Close invoice dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="invoice-document-scroll">
          <article className="invoice-document">
            {/* Restaurant Brand Header */}
            <header className="invoice-brand-block">
              <h1 className="invoice-restaurant-name">{RESTAURANT_DETAILS.name}</h1>
              <p className="invoice-restaurant-tagline">{RESTAURANT_DETAILS.tagline}</p>
              <p className="invoice-restaurant-contact">{RESTAURANT_DETAILS.address}</p>
              <p className="invoice-restaurant-contact">
                Tel: {RESTAURANT_DETAILS.telephone} | Email: {RESTAURANT_DETAILS.email}
              </p>
              <p className="invoice-restaurant-tax">
                Tax Reg: {RESTAURANT_DETAILS.taxRegistrationNumber}
              </p>
            </header>

            {/* Document Title & Paid Stamp */}
            <div className="invoice-title-row">
              <span className="invoice-doc-label">Tax Invoice & Dining Receipt</span>
              <span className="invoice-paid-stamp">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Paid & Settled
              </span>
            </div>

            {/* Metadata 2-Column Grid */}
            <div className="invoice-meta-grid">
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Invoice Number</span>
                <span className="invoice-meta-value">{invoiceNumber}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Order Reference</span>
                <span className="invoice-meta-value">
                  {order.orderReference || `#${order.orderId}`}
                </span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Date & Time</span>
                <span className="invoice-meta-value">{dateFormatted}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Dining Service</span>
                <span className="invoice-meta-value">{diningType}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Payment Channel</span>
                <span className="invoice-meta-value">
                  {order.paymentMethod || 'Online Gateway'}
                </span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Billing Status</span>
                <span className="invoice-meta-value" style={{ color: '#047857' }}>
                  {order.paymentStatus || 'Succeeded'}
                </span>
              </div>
            </div>

            {/* Delicacies Line Items Table */}
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Delicacy</th>
                  <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>Rate</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#8a7a6b' }}>
                      Dining service package
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const qty = Number(item.quantity ?? 1);
                    const unitPrice = Number(item.unitPrice ?? 0);
                    const lineTotal = qty * unitPrice;

                    return (
                      <tr key={item.orderItemId || idx}>
                        <td style={{ color: '#8c7355', fontSize: '0.78rem' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>
                          {item.itemName || `Menu Item #${item.menuItemId}`}
                        </td>
                        <td style={{ textAlign: 'center' }}>{qty}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="invoice-summary-block">
              <div className="invoice-summary-row">
                <span>Subtotal ({summary.totalQuantity} items):</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="invoice-summary-row">
                <span>Taxes & Levies (10% VAT):</span>
                <span>Inclusive</span>
              </div>
              <div className="invoice-summary-row total-row">
                <span>Total Amount Paid:</span>
                <span>{formatCurrency(summary.total)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <footer className="invoice-footer-notes">
              <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                Thank you for experiencing Cinnamon Bistro!
              </p>
              <p style={{ margin: '0 0 4px 0' }}>
                We eagerly await the privilege of welcoming you again.
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#a89d91' }}>
                This is a system-generated official tax invoice verified by Cinnamon Bistro Management.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
