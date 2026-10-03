import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getPendingVerifications, verifyPayment } from '../../services/paymentService';
import { resolveImageUrl } from '../../services/menuImageUrl';
import './adminPayments.css';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewSlipUrl, setPreviewSlipUrl] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadPendingPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPendingVerifications();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load pending payment verifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingPayments();
  }, [loadPendingPayments]);

  const handleVerify = async (paymentId, action) => {
    const actionLabel = action === 'Approve' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this payment?`)) {
      return;
    }

    try {
      setActionLoadingId(paymentId);
      setError('');
      setSuccess('');
      await verifyPayment(paymentId, { action });
      setSuccess(`Payment #${paymentId} successfully marked as ${action === 'Approve' ? 'Succeeded' : 'Failed'}.`);
      await loadPendingPayments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${actionLabel} payment #${paymentId}.`
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.paymentMethod === filter;
  });

  const cashCount = payments.filter((p) => p.paymentMethod === 'Cash').length;
  const bankCount = payments.filter((p) => p.paymentMethod === 'BankTransfer').length;

  return (
    <main className="admin-payments-page">
      <PageHeader
        title="Payment Verifications"
        subtitle="Review and confirm customer cash settlements and uploaded bank transfer slips"
      />

      <section className="admin-payments-metrics" aria-label="Verification Summary">
        <div className="admin-payments-metric-card">
          <div className="admin-payments-metric-accent" />
          <div className="admin-payments-metric-label">Total Pending Review</div>
          <div className="admin-payments-metric-val">{payments.length}</div>
        </div>

        <div className="admin-payments-metric-card">
          <div className="admin-payments-metric-accent" />
          <div className="admin-payments-metric-label">Cash Settlement Requests</div>
          <div className="admin-payments-metric-val">{cashCount}</div>
        </div>

        <div className="admin-payments-metric-card">
          <div className="admin-payments-metric-accent" />
          <div className="admin-payments-metric-label">Bank Slips Requiring Approval</div>
          <div className="admin-payments-metric-val">{bankCount}</div>
        </div>
      </section>

      <div className="admin-payments-toolbar">
        <div className="admin-payments-tabs">
          <button
            type="button"
            className={`admin-payments-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Pending ({payments.length})
          </button>
          <button
            type="button"
            className={`admin-payments-tab-btn ${filter === 'Cash' ? 'active' : ''}`}
            onClick={() => setFilter('Cash')}
          >
            Cash Requests ({cashCount})
          </button>
          <button
            type="button"
            className={`admin-payments-tab-btn ${filter === 'BankTransfer' ? 'active' : ''}`}
            onClick={() => setFilter('BankTransfer')}
          >
            Bank Slips ({bankCount})
          </button>
        </div>

        <button
          type="button"
          className="admin-payments-refresh-btn"
          onClick={loadPendingPayments}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: '#10b981', marginBottom: '16px' }}>{success}</div>}

      <div className="admin-payments-table-card">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#7c7162' }}>
            Loading pending payment verifications...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#7c7162' }}>
            No pending payments requiring verification at this time.
          </div>
        ) : (
          <table className="admin-payments-table">
            <thead>
              <tr>
                <th>Payment Ref</th>
                <th>Order</th>
                <th>Method</th>
                <th>Amount (LKR)</th>
                <th>Slip / Deposit Ref</th>
                <th>Customer Notes</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const isBank = p.paymentMethod === 'BankTransfer';
                const slipSrc = p.slipUrl ? resolveImageUrl(p.slipUrl) : null;
                const isProcessing = actionLoadingId === p.paymentId;

                return (
                  <tr key={p.paymentId}>
                    <td>
                      <strong>{p.merchantOrderReference}</strong>
                    </td>
                    <td>
                      <div>
                        {p.orderType === 'ReservationPreOrder'
                          ? `PRE #${p.orderId}`
                          : `DIN #${p.orderId}`}
                      </div>
                      <small style={{ color: '#8c8275' }}>Cust #{p.customerId}</small>
                    </td>
                    <td>
                      <span
                        className={`admin-payments-badge ${
                          isBank
                            ? 'admin-payments-badge-bank'
                            : 'admin-payments-badge-cash'
                        }`}
                      >
                        {isBank ? '🏦 Bank Transfer' : '💵 Cash'}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {Number(p.amount).toLocaleString('en-LK', {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </td>
                    <td>
                      {isBank ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {slipSrc && (
                            <img
                              src={slipSrc}
                              alt="Slip thumbnail"
                              className="admin-slip-thumb"
                              onClick={() => setPreviewSlipUrl(slipSrc)}
                              title="Click to zoom slip image"
                            />
                          )}
                          {p.providerPaymentId && (
                            <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                              Ref: {p.providerPaymentId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Counter / Table</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                        {p.customerNotes || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                      {new Date(p.createdAt).toLocaleString('en-LK')}
                    </td>
                    <td>
                      <div className="admin-payments-actions">
                        <button
                          type="button"
                          className="admin-btn-approve"
                          onClick={() => handleVerify(p.paymentId, 'Approve')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? '...' : '✓ Approve'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reject"
                          onClick={() => handleVerify(p.paymentId, 'Reject')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? '...' : '✕ Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {previewSlipUrl && (
        <div
          className="slip-preview-modal-overlay"
          onClick={() => setPreviewSlipUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="slip-preview-container" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}
                onClick={() => setPreviewSlipUrl(null)}
              >
                Close Preview (✕)
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
