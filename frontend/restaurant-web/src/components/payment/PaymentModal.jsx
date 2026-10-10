import React, { useState } from 'react';
import {
  createPayHereCheckout,
  launchPayHereHostedCheckout,
  requestCashPayment,
  submitBankTransferSlip,
  simulatePayHereSandboxPayment,
} from '../../services/paymentService';
import './paymentModal.css';

export default function PaymentModal({ isOpen, onClose, order, onPaymentInitiated }) {
  const [activeTab, setActiveTab] = useState('payhere');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [cashNotes, setCashNotes] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [depositRef, setDepositRef] = useState('');
  const [bankNotes, setBankNotes] = useState('');

  if (!isOpen || !order) return null;

  const formattedAmount = Number(order.totalAmount || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
  });

  const handlePayHere = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const checkoutData = await createPayHereCheckout({
        orderType: order.orderType,
        orderId: order.orderId,
      });

      setSuccessMessage(
        'Connecting to PayHere Secure Payment Portal...'
      );
      launchPayHereHostedCheckout(checkoutData);
      if (onPaymentInitiated) onPaymentInitiated(checkoutData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to initiate PayHere payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInstantSandboxPayment = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('Processing instant sandbox payment confirmation...');

      const result = await simulatePayHereSandboxPayment({
        orderType: order.orderType,
        orderId: order.orderId,
      });

      setSuccessMessage('Payment Succeeded! Order settlement confirmed.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications:updated'));
      }
      setTimeout(() => {
        if (onPaymentInitiated) onPaymentInitiated(result);
        onClose();
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to simulate sandbox payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCash = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const result = await requestCashPayment({
        orderType: order.orderType,
        orderId: order.orderId,
        customerNotes: cashNotes,
      });

      setSuccessMessage('Cash settlement requested! Restaurant staff has been notified.');
      setTimeout(() => {
        if (onPaymentInitiated) onPaymentInitiated(result);
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to request cash settlement. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBankTransfer = async (e) => {
    e.preventDefault();
    if (!slipFile) {
      setError('Please upload a bank deposit slip or transaction receipt.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const formData = new FormData();
      formData.append('orderType', order.orderType);
      formData.append('orderId', order.orderId);
      formData.append('slipFile', slipFile);
      if (depositRef) formData.append('depositReference', depositRef);
      if (bankNotes) formData.append('customerNotes', bankNotes);

      const result = await submitBankTransferSlip(formData);

      setSuccessMessage('Deposit slip uploaded successfully! Under review by staff.');
      setTimeout(() => {
        if (onPaymentInitiated) onPaymentInitiated(result);
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to submit deposit slip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-gold-bar" />

        <header className="payment-modal-header">
          <div className="payment-modal-title-group">
            <h3>Settle Your Order</h3>
            <p>Select your preferred payment method to complete settlement</p>
          </div>
          <button
            type="button"
            className="payment-modal-close-btn"
            onClick={onClose}
            aria-label="Close payment modal"
          >
            ✕
          </button>
        </header>

        <div className="payment-order-summary-strip">
          <div className="payment-summary-meta">
            <span className="payment-summary-ref">
              {order.orderReference || `ORD-${order.orderId}`}
            </span>
            <span className="payment-summary-type">
              {order.orderType === 'ReservationPreOrder'
                ? 'Reservation Pre-Order'
                : 'Dine-In Order'}
            </span>
          </div>
          <div className="payment-summary-amount-box">
            <span className="payment-summary-label">Payable Total</span>
            <span className="payment-summary-amount">{formattedAmount}</span>
          </div>
        </div>

        <nav className="payment-tabs-nav" aria-label="Payment Methods">
          <button
            type="button"
            className={`payment-tab-button ${activeTab === 'payhere' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('payhere');
              setError('');
            }}
          >
            💳 PayHere Online
          </button>
          <button
            type="button"
            className={`payment-tab-button ${activeTab === 'cash' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('cash');
              setError('');
            }}
          >
            💵 Cash Settlement
          </button>
          <button
            type="button"
            className={`payment-tab-button ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bank');
              setError('');
            }}
          >
            🏦 Bank Transfer
          </button>
        </nav>

        <div className="payment-tab-content">
          {error && <div className="payment-alert payment-alert-error">{error}</div>}
          {successMessage && (
            <div className="payment-alert payment-alert-success">{successMessage}</div>
          )}

          {activeTab === 'payhere' && (
            <>
              <div className="payment-info-box">
                <span className="payment-sandbox-pill">⚡ PayHere Secure Gateway</span>
                <p>
                  Settle your bill securely via Credit / Debit Card, digital wallet, or online banking.
                  PayHere supports Visa, MasterCard, AMEX, FriMi, Genie, eZ Cash, and commercial bank transfers.
                </p>
                <div className="payment-supported-methods">
                  <span className="payment-method-chip">Visa / MasterCard</span>
                  <span className="payment-method-chip">AMEX</span>
                  <span className="payment-method-chip">FriMi</span>
                  <span className="payment-method-chip">Genie</span>
                  <span className="payment-method-chip">eZ Cash</span>
                  <span className="payment-method-chip">Online Banking</span>
                </div>
              </div>

              <div className="payment-security-assurance">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>256-Bit SSL Encrypted & Central Bank of Sri Lanka Approved Payment Partner</span>
              </div>

              <div className="payment-actions" style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="payment-primary-btn"
                  onClick={handlePayHere}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Connecting to PayHere…' : `Pay ${formattedAmount} via PayHere`}
                </button>
                <button
                  type="button"
                  className="payment-secondary-btn"
                  onClick={handleInstantSandboxPayment}
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #f7e096 0%, #ddbb78 100%)',
                    color: '#282115',
                    border: '1px solid #c5a059',
                    fontWeight: 700,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 5px rgba(197, 160, 89, 0.25)',
                    fontSize: '0.86rem',
                  }}
                  title="Direct sandbox simulation without external redirect (useful for local development)"
                >
                  ⚡ Instant Sandbox Payment (Direct Localhost)
                </button>
              </div>
            </>
          )}

          {activeTab === 'cash' && (
            <form onSubmit={handleCash}>
              <div className="payment-info-box">
                <p>
                  Request to settle your bill in cash directly at your dining table or at the cashier
                  counter. A dedicated staff member will arrive to assist you.
                </p>
              </div>

              <div className="payment-form-group" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                <label htmlFor="cashNotes">Special Requests / Notes (Optional)</label>
                <textarea
                  id="cashNotes"
                  className="payment-textarea"
                  rows="2"
                  placeholder="e.g. Need change for LKR 5,000, or paying at reception"
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="payment-primary-btn"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Submitting Request...' : 'Confirm Cash Settlement'}
              </button>
            </form>
          )}

          {activeTab === 'bank' && (
            <form onSubmit={handleBankTransfer}>
              <div className="bistro-bank-details">
                <div className="bank-detail-row">
                  <span className="bank-detail-label">Bank</span>
                  <span className="bank-detail-val">Commercial Bank of Ceylon</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bank-detail-label">Branch</span>
                  <span className="bank-detail-val">Colombo 07</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bank-detail-label">Account Name</span>
                  <span className="bank-detail-val">Cinnamon Bistro (Pvt) Ltd</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bank-detail-label">Account Number</span>
                  <span className="bank-detail-val">1000-2458-9901</span>
                </div>
              </div>

              <div className="payment-form-group" style={{ marginTop: '0.5rem' }}>
                <label htmlFor="depositSlip">Deposit Slip / Transfer Receipt *</label>
                <input
                  type="file"
                  id="depositSlip"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  className="payment-input"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  required
                />
                {slipFile && (
                  <div className="payment-file-chosen">
                    <span>📄 {slipFile.name} ({(slipFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer' }}
                      onClick={() => setSlipFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="payment-form-group" style={{ marginTop: '0.45rem' }}>
                <label htmlFor="depositRef">Transaction Reference Number (Optional)</label>
                <input
                  type="text"
                  id="depositRef"
                  className="payment-input"
                  placeholder="e.g. TXN987654321"
                  value={depositRef}
                  onChange={(e) => setDepositRef(e.target.value)}
                />
              </div>

              <div className="payment-form-group" style={{ marginTop: '0.45rem', marginBottom: '0.75rem' }}>
                <label htmlFor="bankNotes">Notes (Optional)</label>
                <textarea
                  id="bankNotes"
                  className="payment-textarea"
                  rows="2"
                  placeholder="e.g. Transferred via Commercial Bank Online Banking app"
                  value={bankNotes}
                  onChange={(e) => setBankNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="payment-primary-btn"
                disabled={loading || !slipFile}
                style={{ width: '100%' }}
              >
                {loading ? 'Uploading Receipt...' : 'Submit Deposit Slip'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
