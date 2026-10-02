import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getAdminFeedback, getAdminFeedbackSummary } from '../../services/feedbackService';

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
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await getAdminFeedbackSummary();
      setSummary(res || { averageRating: 0, totalFeedbacks: 0, ratingDistribution: {} });
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
  }, [currentPage, pageSize, ratingFilter, fromDate, toDate, searchTerm]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFeedbackList();
  }, [fetchFeedbackList]);

  const handleResetFilters = () => {
    setRatingFilter('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setCurrentPage(1);
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

      {/* 1. Metrics / KPI Summary Cards (Matching AdminUserManagementPage) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              Verified dining impressions
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
          {(ratingFilter || fromDate || toDate || searchTerm) && (
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
                <th style={{ padding: '0.85rem 1.25rem' }}>Experience Comments</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #eee3cf', borderTopColor: '#c5a059', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.86rem' }}>Loading customer reviews catalog...</p>
                  </td>
                </tr>
              ) : feedbackData.items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
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

                      {/* Comments */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '420px' }}>
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
    </div>
  );
}
