import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import {
  getAdminFeedback,
  getAdminFeedbackSummary,
  adminDeleteFeedback,
  adminMarkAsRead,
  adminReplyFeedback,
} from '../../services/feedbackService';

// SVG Icons matching Cinnamon Bistro luxury tokens
const IconStar = ({ filled = false, size = 16, color = '#d4af37' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : 'none'}
    stroke={filled ? color : '#cbbea7'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconMessageSquare = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconInbox = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IconCheck = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconReply = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

const IconTrash = ({ size = 14, color = '#be123c' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconAward = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const IconAlertTriangle = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconSearch = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconClose = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRefresh = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export default function AdminFeedbackPage() {
  const [feedbackData, setFeedbackData] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalFeedbacks: 0,
    unreadCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Management Action States
  const [processingId, setProcessingId] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyingFeedback, setReplyingFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await getAdminFeedbackSummary();
      setSummary(res || { averageRating: 0, totalFeedbacks: 0, unreadCount: 0, ratingDistribution: {} });
    } catch {
      // non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchFeedbackList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: currentPage,
        pageSize,
        rating: ratingFilter ? parseInt(ratingFilter, 10) : undefined,
        isRead: readFilter === '' ? undefined : readFilter === 'true',
        fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate: toDate ? new Date(toDate + 'T23:59:59.999Z').toISOString() : undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await getAdminFeedback(params);
      setFeedbackData({
        items: res.items || [],
        totalCount: res.totalCount || 0,
        page: res.page || 1,
        pageSize: res.pageSize || 10,
        totalPages: res.totalPages || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer feedback list.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, ratingFilter, readFilter, fromDate, toDate, searchTerm]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFeedbackList();
  }, [fetchFeedbackList]);

  const handleResetFilters = () => {
    setRatingFilter('');
    setReadFilter('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleToggleRead = async (fb) => {
    try {
      setProcessingId(fb.feedbackId);
      setActionError('');
      setActionSuccess('');
      const targetStatus = !fb.isRead;
      await adminMarkAsRead(fb.feedbackId, targetStatus);
      setActionSuccess(targetStatus ? 'Review marked as read.' : 'Review marked as unread.');
      await Promise.all([fetchFeedbackList(), fetchSummary()]);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update read status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteFeedback = (feedbackId) => {
    setFeedbackToDelete(feedbackId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      setDeleteLoading(true);
      setActionError('');
      setActionSuccess('');
      await adminDeleteFeedback(feedbackToDelete);
      setActionSuccess('Review permanently deleted.');
      setDeleteModalOpen(false);
      setFeedbackToDelete(null);
      await Promise.all([fetchFeedbackList(), fetchSummary()]);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete review.');
      setDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenReplyModal = (fb) => {
    setReplyingFeedback(fb);
    setReplyText(fb.adminReply || '');
    setReplyModalOpen(true);
    setActionError('');
  };

  const handleCloseReplyModal = () => {
    setReplyingFeedback(null);
    setReplyText('');
    setReplyModalOpen(false);
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyingFeedback) return;
    if (!replyText.trim()) {
      setActionError('Response cannot be empty.');
      return;
    }

    try {
      setReplyLoading(true);
      setActionError('');
      setActionSuccess('');
      await adminReplyFeedback(replyingFeedback.feedbackId, replyText.trim());
      setActionSuccess('Response successfully posted to guest feedback review.');
      handleCloseReplyModal();
      await Promise.all([fetchFeedbackList(), fetchSummary()]);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to post reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const renderStars = (starCount, size = 15) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <IconStar key={s} filled={s <= starCount} size={size} color="#d4af37" />
      ))}
    </div>
  );

  const criticalCount = (summary.ratingDistribution?.[1] || 0) + (summary.ratingDistribution?.[2] || 0);
  const fiveStarCount = summary.ratingDistribution?.[5] || 0;
  const fiveStarPercent = summary.totalFeedbacks > 0
    ? Math.round((fiveStarCount / summary.totalFeedbacks) * 100)
    : 0;

  return (
    <div className="portal-page-content" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="ADMINISTRATION & QUALITY CONTROL"
        title={<>Customer Reviews & <em>Rating Analytics.</em></>}
        subtitle="Review guest dining impressions, monitor satisfaction metrics, and track service quality across Cinnamon Bistro."
      />

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#9f1239',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Action Success Notification */}
      {actionSuccess && (
        <div
          role="status"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#166534',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 700, padding: '0 0.4rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Error Notification */}
      {actionError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#9f1239',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✕ {actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9f1239', fontWeight: 700, padding: '0 0.4rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Metrics / KPI Summary Cards (Matching AdminUserManagementPage) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card 1: Average Rating */}
        <div
          className="bistro-card"
          onClick={() => {
            setRatingFilter('');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.15rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            border: ratingFilter === '' ? '2px solid #c5a059' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 100%)',
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#faf5ec',
              border: '1px solid #eedfc9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconStar filled size={22} color="#a87942" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c6736', fontWeight: 700, display: 'block' }}>
              Average Rating
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--bistro-ink)', lineHeight: 1.1 }}>
                {summaryLoading ? '—' : summary.averageRating.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>/ 5.0</span>
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              {renderStars(Math.round(summary.averageRating || 0), 12)}
            </div>
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div
          className="bistro-card"
          onClick={() => {
            setRatingFilter('');
            setReadFilter('');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.15rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #3b82f6 0%, #93c5fd 100%)',
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
              flexShrink: 0,
            }}
          >
            <IconMessageSquare size={22} color="#1d4ed8" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1d4ed8', fontWeight: 700, display: 'block' }}>
              Total Reviews
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: '#1e3a8a', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : summary.totalFeedbacks}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
              Verified impressions
            </span>
          </div>
        </div>

        {/* Card 3: Unread / Pending Attention */}
        <div
          className="bistro-card"
          onClick={() => {
            setReadFilter(readFilter === 'false' ? '' : 'false');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.15rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            border: readFilter === 'false' ? '2px solid #f59e0b' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #f59e0b 0%, #fde68a 100%)',
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              flexShrink: 0,
            }}
          >
            <IconInbox size={22} color="#d97706" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', fontWeight: 700, display: 'block' }}>
              Unread Reviews
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: '#92400e', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : summary.unreadCount}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
              Awaiting review
            </span>
          </div>
        </div>

        {/* Card 3: 5-Star Excellence */}
        <div
          className="bistro-card"
          onClick={() => {
            setRatingFilter('5');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.15rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            border: ratingFilter === '5' ? '2px solid #10b981' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #10b981 0%, #6ee7b7 100%)',
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#047857',
              flexShrink: 0,
            }}
          >
            <IconAward size={22} color="#047857" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#047857', fontWeight: 700, display: 'block' }}>
              5-Star Excellence
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: '#064e3b', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : `${fiveStarPercent}%`}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
              {fiveStarCount} top-tier reviews
            </span>
          </div>
        </div>

        {/* Card 4: Critical Attention (<= 2 Stars) */}
        <div
          className="bistro-card"
          onClick={() => {
            setRatingFilter('2');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.15rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            border: (ratingFilter === '2' || ratingFilter === '1') ? '2px solid #ef4444' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #ef4444 0%, #fca5a5 100%)',
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#be123c',
              flexShrink: 0,
            }}
          >
            <IconAlertTriangle size={22} color="#be123c" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#be123c', fontWeight: 700, display: 'block' }}>
              Needs Attention
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', fontWeight: 700, color: '#881337', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : criticalCount}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
              1 & 2-star reviews
            </span>
          </div>
        </div>
      </div>

      {/* 2. Integrated Filter & Search Bar */}
      <div
        className="bistro-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
          padding: '1rem 1.35rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Keyword Search */}
          <div style={{ position: 'relative', flex: '2 1 240px', minWidth: '200px', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.75rem', color: '#8c6d3f', display: 'flex', pointerEvents: 'none' }}>
              <IconSearch size={15} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search comments, booking #, or order #..."
              style={{
                width: '100%',
                padding: '0.5rem 2rem 0.5rem 2.2rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  display: 'flex',
                }}
                title="Clear search"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>

          {/* Rating Dropdown */}
          <div style={{ flex: '1 1 150px', minWidth: '130px' }}>
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            >
              <option value="">All Star Ratings</option>
              <option value="5">5 Stars — Exceptional</option>
              <option value="4">4 Stars — Very Good</option>
              <option value="3">3 Stars — Average</option>
              <option value="2">2 Stars — Poor</option>
              <option value="1">1 Star — Disappointing</option>
            </select>
          </div>

          {/* Review Status Dropdown */}
          <div style={{ flex: '1 1 150px', minWidth: '130px' }}>
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            >
              <option value="">All Review Statuses</option>
              <option value="false">Unread Only</option>
              <option value="true">Read / Reviewed</option>
            </select>
          </div>

          {/* From Date */}
          <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.48rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              title="From date"
            />
          </div>

          {/* To Date */}
          <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.48rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              title="To date"
            />
          </div>

          {/* Reset Action */}
          {(ratingFilter || readFilter || fromDate || toDate || searchTerm) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="bistro-button-outline"
              style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
            >
              <IconRefresh size={13} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Feedback Data Table Card (Matching MenuManagement & AdminUserManagement) */}
      <div
        className="bistro-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(40, 33, 21, 0.06)',
          border: '1px solid #dfd8cb',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Top Accent Strip */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)' }} />

        {/* Toolbar Header */}
        <div
          style={{
            padding: '1.15rem 1.6rem',
            borderBottom: '1px solid #dfd8cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bistro-well-bg, #faf5ec)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: 'var(--bistro-ink)', margin: 0, fontWeight: 700 }}>
              Verified Guest Reviews
            </h2>
            <span
              style={{
                display: 'inline-block',
                padding: '0.15rem 0.65rem',
                background: '#eee3cf',
                color: '#6b532f',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {feedbackData.totalCount} {feedbackData.totalCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
            Customer identities masked to preserve dining privacy (SR-235)
          </span>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr
                style={{
                  background: '#fbf8f2',
                  borderBottom: '1px solid #e8e0d0',
                  color: '#8c6736',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '0.85rem 1.25rem' }}>Customer</th>
                <th style={{ padding: '0.85rem 1rem' }}>Rating</th>
                <th style={{ padding: '0.85rem 1rem' }}>Linked Visit</th>
                <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Guest Experience & Reply</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #eee3cf', borderTopColor: '#c5a059', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.86rem' }}>Loading customer reviews catalog...</p>
                  </td>
                </tr>
              ) : feedbackData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#faf5ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                      <IconStar filled size={24} color="#c5a059" />
                    </div>
                    <h4 style={{ fontFamily: 'Georgia, serif', margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--bistro-ink)' }}>
                      No feedback entries found
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Try clearing or relaxing your search filters.</p>
                  </td>
                </tr>
              ) : (
                feedbackData.items.map((fb, idx) => {
                  const isCritical = fb.rating <= 2;
                  return (
                    <tr
                      key={fb.feedbackId}
                      style={{
                        borderBottom: '1px solid #f0e9df',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfaf6',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Customer Privacy Masked Display */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #f7e096 0%, #ddbb78 100%)',
                              color: '#282115',
                              fontFamily: 'Georgia, serif',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 4px rgba(221, 187, 120, 0.4)',
                              flexShrink: 0,
                            }}
                          >
                            C
                          </div>
                          <div>
                            <span style={{ display: 'block', fontWeight: 700, color: 'var(--bistro-ink)', fontSize: '0.84rem' }}>
                              {fb.customerDisplayName || `Customer #${fb.customerId}`}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#8c6736' }}>
                              Verified Guest
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rating Column */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {renderStars(fb.rating, 14)}
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: isCritical ? '#be123c' : '#8c6736',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: isCritical ? '#fff1f2' : '#faf5ec',
                            }}
                          >
                            {fb.rating}.0 ★
                          </span>
                        </div>
                      </td>

                      {/* Linked Visit Reference */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        {fb.bookingReference ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              backgroundColor: '#faf5ec',
                              border: '1px solid #eedfc9',
                              color: '#6b532f',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            Booking #{fb.bookingReference}
                          </span>
                        ) : fb.orderReference ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              backgroundColor: '#faf8f4',
                              border: '1px solid #dfd8cb',
                              color: '#493628',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            {fb.orderReference}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--bistro-muted)', fontStyle: 'italic' }}>
                            General Dining
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                        {new Date(fb.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Status Column */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        {fb.isRead ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              border: '1px solid #e5e7eb',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9ca3af' }} />
                            Reviewed
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                            NEW
                          </span>
                        )}
                      </td>

                      {/* Comments & Reply */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '380px', minWidth: '220px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {fb.comment ? (
                          <div>
                            {isCritical && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.68rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  fontWeight: 700,
                                  color: '#be123c',
                                  backgroundColor: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  borderRadius: '4px',
                                  padding: '0.1rem 0.4rem',
                                  marginBottom: '0.35rem',
                                }}
                              >
                                Attention Required
                              </span>
                            )}
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.82rem',
                                color: 'var(--bistro-ink)',
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              “{fb.comment}”
                            </p>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--bistro-muted)', fontStyle: 'italic' }}>
                            No written review provided.
                          </span>
                        )}
                        {/* Management Response Box */}
                        {fb.adminReply && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#faf6ee',
                              borderLeft: '3px solid #c5a059',
                              borderTop: '1px solid #eee6d8',
                              borderRight: '1px solid #eee6d8',
                              borderBottom: '1px solid #eee6d8',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: '#8c6736' }}>
                                Response from Cinnamon Bistro:
                              </span>
                              {fb.adminRepliedAt && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--bistro-muted)' }}>
                                  {new Date(fb.adminRepliedAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, color: '#493628', lineHeight: 1.45, fontStyle: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                              {fb.adminReply}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Management Actions */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                          {/* Mark Read/Unread Toggle */}
                          <button
                            type="button"
                            disabled={processingId === fb.feedbackId}
                            onClick={() => handleToggleRead(fb)}
                            className="bistro-button-outline"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.74rem',
                              backgroundColor: fb.isRead ? '#ffffff' : '#f0fdf4',
                              color: fb.isRead ? '#6b532f' : '#166534',
                              borderColor: fb.isRead ? '#d9d0bf' : '#bbf7d0',
                              cursor: 'pointer',
                            }}
                            title={fb.isRead ? 'Mark as Unread' : 'Mark as Read'}
                          >
                            <IconCheck size={12} color={fb.isRead ? '#6b532f' : '#166534'} />
                            <span>{fb.isRead ? 'Unread' : 'Mark Read'}</span>
                          </button>

                          {/* Reply / Edit Reply */}
                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(fb)}
                            className="bistro-button-outline"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.74rem',
                              backgroundColor: fb.adminReply ? '#faf5ec' : '#ffffff',
                              color: '#8c6736',
                              borderColor: '#eedfc9',
                              cursor: 'pointer',
                            }}
                            title={fb.adminReply ? 'Edit Management Response' : 'Reply to Guest'}
                          >
                            <IconReply size={12} color="#8c6736" />
                            <span>{fb.adminReply ? 'Edit Reply' : 'Reply'}</span>
                          </button>

                          {/* Delete Review */}
                          <button
                            type="button"
                            disabled={processingId === fb.feedbackId}
                            onClick={() => handleDeleteFeedback(fb.feedbackId)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#be123c',
                              border: '1px solid #fecdd3',
                              borderRadius: '6px',
                              padding: '0.3rem 0.55rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete Review"
                          >
                            <IconTrash size={12} color="#be123c" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (Matching Bistro Table Footer Standards) */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #dfd8cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bistro-well-bg, #faf5ec)',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.82rem',
            color: 'var(--bistro-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              style={{
                padding: '0.3rem 0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #d9d0bf',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span style={{ marginLeft: '0.5rem' }}>
              Showing {feedbackData.totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, feedbackData.totalCount)} of {feedbackData.totalCount} entries
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="bistro-button-outline"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                opacity: currentPage <= 1 ? 0.45 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ fontWeight: 600, color: 'var(--bistro-ink)', padding: '0 0.35rem' }}>
              Page {feedbackData.totalPages > 0 ? currentPage : 0} of {feedbackData.totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= feedbackData.totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(feedbackData.totalPages, p + 1))}
              className="bistro-button-outline"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                opacity: currentPage >= feedbackData.totalPages ? 0.45 : 1,
                cursor: currentPage >= feedbackData.totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 4. Luxury Admin Reply Modal */}
      {replyModalOpen && replyingFeedback && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="replyModalTitle"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(26, 20, 12, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}
        >
          <div
            className="bistro-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #ebdcc5',
              boxShadow: '0 25px 60px rgba(40, 30, 15, 0.25)',
              overflow: 'hidden',
              position: 'relative',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {/* Top Gold Gradient */}
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)' }} />

            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                <div>
                  <h3
                    id="replyModalTitle"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      color: 'var(--bistro-ink)',
                      margin: '0 0 0.3rem 0',
                    }}
                  >
                    {replyingFeedback.adminReply ? 'Edit Management Response' : 'Reply to Guest Review'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                    <span>{replyingFeedback.customerDisplayName || `Customer #${replyingFeedback.customerId}`}</span>
                    <span>•</span>
                    <span style={{ color: '#8c6736', fontWeight: 700 }}>{replyingFeedback.rating}.0 ★</span>
                    {replyingFeedback.bookingReference && (
                      <>
                        <span>•</span>
                        <span>Booking #{replyingFeedback.bookingReference}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReplyModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8c8273',
                    padding: '0.2rem',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                  }}
                  title="Close"
                >
                  <IconClose size={16} />
                </button>
              </div>

              {/* Guest Comment Excerpt */}
              <div
                style={{
                  backgroundColor: '#faf8f4',
                  border: '1px solid #eee6d8',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c6736', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                  Guest Dining Impressions
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--bistro-ink)', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                  “{replyingFeedback.comment || 'No written critique provided.'}”
                </p>
              </div>

              {/* Response Form */}
              <form onSubmit={handleSubmitReply}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label
                    htmlFor="adminReplyInput"
                    style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--bistro-ink)' }}
                  >
                    Official Bistro Management Response <span style={{ color: '#be123c' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: replyText.length > 950 ? '#be123c' : 'var(--bistro-muted)' }}>
                    {replyText.length} / 1000
                  </span>
                </div>

                <textarea
                  id="adminReplyInput"
                  rows={4}
                  maxLength={1000}
                  required
                  placeholder="Thank the guest for their dining impressions and outline culinary craftsmanship or service improvements..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    backgroundColor: '#faf8f4',
                    border: '1px solid #d9d0bf',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    color: 'var(--bistro-ink)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />

                <p style={{ margin: '0.4rem 0 1.25rem', fontSize: '0.74rem', color: 'var(--bistro-muted)' }}>
                  This response will be visible to the customer when viewing their past review and across the customer portal.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleCloseReplyModal}
                    className="bistro-button-outline"
                    style={{ padding: '0.55rem 1.15rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replyLoading || !replyText.trim()}
                    className="bistro-button-gold"
                    style={{
                      padding: '0.55rem 1.45rem',
                      opacity: replyLoading || !replyText.trim() ? 0.6 : 1,
                      cursor: replyLoading || !replyText.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {replyLoading ? 'Posting...' : (replyingFeedback.adminReply ? 'Update Response' : 'Post Response')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Luxury Confirmation Modal for Review Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setFeedbackToDelete(null);
          }
        }}
        onConfirm={handleConfirmDeleteFeedback}
        title="Delete Customer Review"
        message="Are you sure you want to permanently delete this customer review from restaurant archives? This moderation action cannot be reversed."
        confirmText="Yes, Delete Review"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
