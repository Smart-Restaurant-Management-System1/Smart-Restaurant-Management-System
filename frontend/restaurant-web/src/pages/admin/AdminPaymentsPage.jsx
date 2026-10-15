import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import {
  getPendingVerifications,
  getPaymentHistory,
  verifyPayment,
} from '../../services/paymentService';
import { resolveImageUrl } from '../../services/menuImageUrl';
import './adminPayments.css';

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [pendingPayments, setPendingPayments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [pendingFilter, setPendingFilter] = useState('all'); // 'all' | 'Cash' | 'BankTransfer'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'Succeeded' | 'Failed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewSlipUrl, setPreviewSlipUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Luxury Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    payment: null,
    action: 'Approve', // 'Approve' | 'Reject'
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [pendingData, historyData] = await Promise.all([
        getPendingVerifications(),
        getPaymentHistory({ limit: 100 }),
      ]);
      setPendingPayments(Array.isArray(pendingData) ? pendingData : []);
      setHistoryPayments(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load payment records. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openConfirmModal = (payment, action) => {
    setError('');
    setSuccess('');
    setConfirmModal({
      isOpen: true,
      payment,
      action,
      notes: '',
    });
  };

  const closeConfirmModal = () => {
    if (actionLoading) return;
    setConfirmModal({
      isOpen: false,
      payment: null,
      action: 'Approve',
      notes: '',
    });
  };

  const handleExecuteVerification = async () => {
    const { payment, action, notes } = confirmModal;
    if (!payment) return;

    if (action === 'Reject' && (!notes || notes.trim().length === 0)) {
      setError('Please provide a reason or note for rejecting this payment.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      await verifyPayment(payment.paymentId, { action, notes: notes?.trim() });
      setSuccess(
        `Payment #${payment.paymentId} for ${
          payment.orderType === 'ReservationPreOrder' ? 'Pre-Order' : 'Dine-In'
        } #${payment.orderId} was successfully marked as ${
          action === 'Approve' ? 'Succeeded (Paid)' : 'Failed (Rejected)'
        }.`
      );
      closeConfirmModal();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${action.toLowerCase()} payment #${payment.paymentId}.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered views
  const filteredPending = pendingPayments.filter((p) => {
    if (pendingFilter === 'all') return true;
    return p.paymentMethod === pendingFilter;
  });

  const filteredHistory = historyPayments.filter((p) => {
    if (historyFilter === 'all') return true;
    return p.status === historyFilter;
  });

  const cashCount = pendingPayments.filter((p) => p.paymentMethod === 'Cash').length;
  const bankCount = pendingPayments.filter((p) => p.paymentMethod === 'BankTransfer').length;
  const succeededCount = historyPayments.filter((p) => p.status === 'Succeeded').length;
  const totalSettledAmount = historyPayments
    .filter((p) => p.status === 'Succeeded')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <main className="admin-payments-page">
      <PageHeader
        title="Payment Management & Verifications"
        subtitle="Review customer cash settlements, verify bank transfer deposit slips, and audit verified transactions"
      />

      {/* Top Main Navigation Tabs: Pending Verifications vs Payment History */}
      <div className="admin-payments-main-nav">
        <button
          type="button"
          className={`admin-payments-nav-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="nav-tab-title">Pending Verifications</span>
          {pendingPayments.length > 0 && (
            <span className="admin-nav-badge">{pendingPayments.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`admin-payments-nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="nav-tab-title">Verified Payments & History</span>
          <span className="admin-nav-count">({historyPayments.length})</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      {activeTab === 'pending' ? (
        <section className="admin-payments-metrics" aria-label="Verification Summary">
          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Total Pending Review</div>
            <div className="admin-payments-metric-val">{pendingPayments.length}</div>
          </div>

          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Cash Settlements Pending</div>
            <div className="admin-payments-metric-val">{cashCount}</div>
          </div>

          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Bank Slips Requiring Verification</div>
            <div className="admin-payments-metric-val">{bankCount}</div>
          </div>
        </section>
      ) : (
        <section className="admin-payments-metrics" aria-label="History Summary">
          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Total Verified Payments</div>
            <div className="admin-payments-metric-val">{succeededCount}</div>
          </div>

          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Total Revenue Settled</div>
            <div className="admin-payments-metric-val">
              LKR {totalSettledAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="admin-payments-metric-card">
            <div className="admin-payments-metric-accent" />
            <div className="admin-payments-metric-label">Total Historical Records</div>
            <div className="admin-payments-metric-val">{historyPayments.length}</div>
          </div>
        </section>
      )}

      {/* Toolbar & Filter Tabs */}
      <div className="admin-payments-toolbar">
        {activeTab === 'pending' ? (
          <div className="admin-payments-tabs">
            <button
              type="button"
              className={`admin-payments-tab-btn ${pendingFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPendingFilter('all')}
            >
              All Pending ({pendingPayments.length})
            </button>
            <button
              type="button"
              className={`admin-payments-tab-btn ${pendingFilter === 'Cash' ? 'active' : ''}`}
              onClick={() => setPendingFilter('Cash')}
            >
              💵 Cash Requests ({cashCount})
            </button>
            <button
              type="button"
              className={`admin-payments-tab-btn ${pendingFilter === 'BankTransfer' ? 'active' : ''}`}
              onClick={() => setPendingFilter('BankTransfer')}
            >
              🏦 Bank Slips ({bankCount})
            </button>
          </div>
        ) : (
          <div className="admin-payments-tabs">
            <button
              type="button"
              className={`admin-payments-tab-btn ${historyFilter === 'all' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('all')}
            >
              All History ({historyPayments.length})
            </button>
            <button
              type="button"
              className={`admin-payments-tab-btn ${historyFilter === 'Succeeded' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('Succeeded')}
            >
              ✓ Succeeded / Paid ({succeededCount})
            </button>
            <button
              type="button"
              className={`admin-payments-tab-btn ${historyFilter === 'Failed' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('Failed')}
            >
              ✕ Rejected / Failed
            </button>
          </div>
        )}

        <button
          type="button"
          className="admin-payments-refresh-btn"
          onClick={loadData}
          disabled={loading}
          title="Refresh payment records"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && <div className="admin-payments-alert admin-payments-alert-error">{error}</div>}
      {success && <div className="admin-payments-alert admin-payments-alert-success">{success}</div>}

      {/* VIEW 1: PENDING VERIFICATIONS TABLE */}
      {activeTab === 'pending' && (
        <div className="admin-payments-table-card">
          {loading ? (
            <div className="admin-payments-empty-state">Loading pending payment verifications...</div>
          ) : filteredPending.length === 0 ? (
            <div className="admin-payments-empty-state">
              🎉 No pending payments requiring verification at this time. All customer settlements are up to date!
            </div>
          ) : (
            <div className="admin-payments-table-responsive">
              <table className="admin-payments-table">
                <thead>
                  <tr>
                    <th>Payment Ref</th>
                    <th>Order Details</th>
                    <th>Method</th>
                    <th>Amount (LKR)</th>
                    <th>Deposit Slip / Ref</th>
                    <th>Customer Note</th>
                    <th>Requested At</th>
                    <th>Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((p) => {
                    const isBank = p.paymentMethod === 'BankTransfer';
                    const slipSrc = p.slipUrl ? resolveImageUrl(p.slipUrl) : null;

                    return (
                      <tr key={p.paymentId}>
                        <td>
                          <span className="admin-payment-ref-badge">{p.merchantOrderReference}</span>
                        </td>
                        <td>
                          <div className="admin-order-ref-title">
                            {p.orderType === 'ReservationPreOrder'
                              ? `Pre-Order #${p.orderId}`
                              : `Dine-In #${p.orderId}`}
                          </div>
                          <span className="admin-customer-subtext">Customer #{p.customerId}</span>
                        </td>
                        <td>
                          <span
                            className={`admin-payments-badge ${
                              isBank ? 'admin-payments-badge-bank' : 'admin-payments-badge-cash'
                            }`}
                          >
                            {isBank ? '🏦 Bank Transfer' : '💵 Cash'}
                          </span>
                        </td>
                        <td>
                          <strong className="admin-payment-amount">
                            {Number(p.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td>
                          {isBank ? (
                            <div className="admin-slip-cell">
                              {slipSrc ? (
                                <button
                                  type="button"
                                  className="admin-slip-thumb-btn"
                                  onClick={() => setPreviewSlipUrl(slipSrc)}
                                  title="Click to preview & zoom slip"
                                >
                                  <img src={slipSrc} alt="Slip thumbnail" className="admin-slip-thumb" />
                                  <span className="admin-slip-zoom-hint">🔍 View</span>
                                </button>
                              ) : (
                                <span className="admin-no-slip">No image file</span>
                              )}
                              {p.providerPaymentId && (
                                <span className="admin-slip-bank-ref">Ref: {p.providerPaymentId}</span>
                              )}
                            </div>
                          ) : (
                            <span className="admin-counter-note">Settlement at Counter / Table</span>
                          )}
                        </td>
                        <td>
                          <span className="admin-customer-notes-cell">{p.customerNotes || '—'}</span>
                        </td>
                        <td className="admin-date-cell">
                          {new Date(p.createdAt).toLocaleString('en-LK', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <div className="admin-payments-actions">
                            <button
                              type="button"
                              className="admin-btn-approve"
                              onClick={() => openConfirmModal(p, 'Approve')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="admin-btn-reject"
                              onClick={() => openConfirmModal(p, 'Reject')}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: VERIFIED & COMPLETED PAYMENTS HISTORY */}
      {activeTab === 'history' && (
        <div className="admin-payments-table-card">
          {loading ? (
            <div className="admin-payments-empty-state">Loading payment history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="admin-payments-empty-state">
              No historical payment records found for the selected filter.
            </div>
          ) : (
            <div className="admin-payments-table-responsive">
              <table className="admin-payments-table">
                <thead>
                  <tr>
                    <th>Payment Ref</th>
                    <th>Order Details</th>
                    <th>Payment Method</th>
                    <th>Amount (LKR)</th>
                    <th>Status</th>
                    <th>Verified By</th>
                    <th>Verification Date</th>
                    <th>Deposit Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((p) => {
                    const isSuccess = p.status === 'Succeeded';
                    const isBank = p.paymentMethod === 'BankTransfer';
                    const slipSrc = p.slipUrl ? resolveImageUrl(p.slipUrl) : null;

                    return (
                      <tr key={p.paymentId}>
                        <td>
                          <span className="admin-payment-ref-badge">{p.merchantOrderReference}</span>
                        </td>
                        <td>
                          <div className="admin-order-ref-title">
                            {p.orderType === 'ReservationPreOrder'
                              ? `Pre-Order #${p.orderId}`
                              : `Dine-In #${p.orderId}`}
                          </div>
                          <span className="admin-customer-subtext">Customer #{p.customerId}</span>
                        </td>
                        <td>
                          <span
                            className={`admin-payments-badge ${
                              p.paymentMethod === 'PayHere'
                                ? 'admin-payments-badge-payhere'
                                : isBank
                                ? 'admin-payments-badge-bank'
                                : 'admin-payments-badge-cash'
                            }`}
                          >
                            {p.paymentMethod === 'PayHere'
                              ? '💳 PayHere Online'
                              : isBank
                              ? '🏦 Bank Transfer'
                              : '💵 Cash'}
                          </span>
                        </td>
                        <td>
                          <strong className="admin-payment-amount">
                            {Number(p.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`admin-history-status-badge ${
                              isSuccess ? 'status-succeeded' : 'status-failed'
                            }`}
                          >
                            <span className="status-dot" />
                            {isSuccess ? 'Paid / Approved' : p.status}
                          </span>
                        </td>
                        <td className="admin-verified-cell">
                          {p.verifiedBy ? `Staff #${p.verifiedBy}` : p.paymentMethod === 'PayHere' ? 'PayHere Gateway' : '—'}
                        </td>
                        <td className="admin-date-cell">
                          {new Date(p.verifiedAt || p.updatedAt || p.createdAt).toLocaleString('en-LK', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          {isBank && slipSrc ? (
                            <button
                              type="button"
                              className="admin-slip-thumb-btn"
                              onClick={() => setPreviewSlipUrl(slipSrc)}
                              title="Click to view slip"
                            >
                              <img src={slipSrc} alt="Slip" className="admin-slip-thumb" />
                            </button>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LUXURY CONFIRMATION MODAL (Replaces window.confirm) */}
      {confirmModal.isOpen && confirmModal.payment && (
        <div
          className="admin-confirm-modal-overlay"
          onClick={closeConfirmModal}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              className={`admin-confirm-modal-bar ${
                confirmModal.action === 'Approve' ? 'bar-approve' : 'bar-reject'
              }`}
            />

            <div className="admin-confirm-modal-header">
              <div
                className={`admin-confirm-modal-icon ${
                  confirmModal.action === 'Approve' ? 'icon-approve' : 'icon-reject'
                }`}
              >
                {confirmModal.action === 'Approve' ? '✓' : '⚠'}
              </div>
              <div className="admin-confirm-modal-title-wrap">
                <h3>
                  {confirmModal.action === 'Approve'
                    ? 'Confirm Payment Approval'
                    : 'Confirm Payment Rejection'}
                </h3>
                <p>
                  {confirmModal.action === 'Approve'
                    ? 'Verify that the settlement or deposit slip is accurate before marking this order as Paid.'
                    : 'Provide a reason for rejecting this settlement. The customer order will remain unpaid.'}
                </p>
              </div>
            </div>

            {/* Payment Summary Box inside Confirmation Modal */}
            <div className="admin-confirm-summary-box">
              <div className="admin-confirm-row">
                <span className="confirm-label">Order:</span>
                <span className="confirm-value">
                  {confirmModal.payment.orderType === 'ReservationPreOrder'
                    ? `Pre-Order #${confirmModal.payment.orderId}`
                    : `Dine-In #${confirmModal.payment.orderId}`}
                </span>
              </div>
              <div className="admin-confirm-row">
                <span className="confirm-label">Amount:</span>
                <span className="confirm-value confirm-amount">
                  LKR{' '}
                  {Number(confirmModal.payment.amount).toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="admin-confirm-row">
                <span className="confirm-label">Method:</span>
                <span className="confirm-value">
                  {confirmModal.payment.paymentMethod === 'BankTransfer'
                    ? '🏦 Bank Transfer Slip'
                    : '💵 Cash on Delivery / Counter'}
                </span>
              </div>
              <div className="admin-confirm-row">
                <span className="confirm-label">Customer:</span>
                <span className="confirm-value">Customer #{confirmModal.payment.customerId}</span>
              </div>
              {confirmModal.payment.customerNotes && (
                <div className="admin-confirm-row">
                  <span className="confirm-label">Customer Note:</span>
                  <span className="confirm-value customer-note-italic">
                    "{confirmModal.payment.customerNotes}"
                  </span>
                </div>
              )}
            </div>

            {/* Optional/Required Notes Input */}
            <div className="admin-confirm-input-group">
              <label htmlFor="adminVerifyNotes">
                Verification Remarks {confirmModal.action === 'Reject' && <span style={{ color: '#ef4444' }}>* (Required)</span>}
              </label>
              <textarea
                id="adminVerifyNotes"
                rows="2"
                className="admin-confirm-textarea"
                placeholder={
                  confirmModal.action === 'Approve'
                    ? 'Optional: e.g., Confirmed cash received at counter / Verified on online banking'
                    : 'Required: e.g., Unclear receipt image / Amount does not match order total'
                }
                value={confirmModal.notes}
                onChange={(e) =>
                  setConfirmModal((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            {/* Action Buttons */}
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-confirm-btn-cancel"
                onClick={closeConfirmModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-confirm-btn-action ${
                  confirmModal.action === 'Approve' ? 'btn-confirm-approve' : 'btn-confirm-reject'
                }`}
                onClick={handleExecuteVerification}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Processing...'
                  : confirmModal.action === 'Approve'
                  ? '✓ Confirm & Mark as Paid'
                  : '✕ Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN SLIP PREVIEW MODAL */}
      {previewSlipUrl && (
        <div
          className="slip-preview-modal-overlay"
          onClick={() => setPreviewSlipUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="slip-preview-container" onClick={(e) => e.stopPropagation()}>
            <div className="slip-preview-header">
              <span className="slip-preview-title">Bank Transfer Deposit Slip</span>
              <button
                type="button"
                className="slip-preview-close-btn"
                onClick={() => setPreviewSlipUrl(null)}
              >
                ✕ Close
              </button>
            </div>
            <img
              src={previewSlipUrl}
              alt="Bank Transfer Slip Full Preview"
              className="slip-preview-img"
            />
          </div>
        </div>
      )}
    </main>
  );
}
