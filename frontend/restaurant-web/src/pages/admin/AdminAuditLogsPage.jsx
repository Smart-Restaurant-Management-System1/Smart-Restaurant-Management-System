import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  getAuditLogs,
  getAuditActionTypes,
  validateAuditDateRange,
  getAuditDatePreset,
  formatActionType,
  downloadAuditLogsCsv,
  downloadAuditLogsExcel,
  downloadAuditLogsPdf
} from '../../services/adminAuditService';

// SVG Icons
const IconShieldCheck = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconSearch = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconRefresh = ({ size = 15, color = 'currentColor', spinning = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      animation: spinning ? 'spin 1s linear infinite' : 'none',
      transformOrigin: 'center'
    }}
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconFilter = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconClose = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconFileText = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconDownload = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);


const CANONICAL_ACTIONS = [
  'USER_BLOCKED',
  'USER_UNBLOCKED',
  'USER_DELETED',
  'MENU_ITEM_CREATED',
  'MENU_ITEM_UPDATED',
  'MENU_AVAILABILITY_CHANGED',
  'MENU_ITEM_DELETED',
  'RESERVATION_STATUS_CHANGED',
  'RESERVATION_RESCHEDULED',
  'TABLE_CREATED',
  'TABLE_UPDATED',
  'TABLE_DELETED'
];

const KEY_LABEL_MAP = {
  targetUserId: 'Target User ID',
  email: 'User Email',
  role: 'User Role',
  newStatus: 'New Status',
  previousStatus: 'Previous Status',
  reason: 'Reason / Notes',
  isAvailable: 'Dish Availability',
  menuItemId: 'Dish ID',
  name: 'Dish / Item Name',
  price: 'Price (LKR)',
  category: 'Item Category',
  reservationId: 'Reservation ID',
  customerName: 'Customer Name',
  tableNumber: 'Table Number',
  capacity: 'Seating Capacity',
  location: 'Dining Location',
  updatedBy: 'Initiated By'
};

function formatDetailKey(key) {
  if (KEY_LABEL_MAP[key]) return KEY_LABEL_MAP[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function renderDetailValue(val) {
  if (val === null || val === undefined) {
    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</span>;
  }
  if (typeof val === 'boolean') {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.15rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.74rem',
          fontWeight: 600,
          backgroundColor: val ? '#ecfdf5' : '#fef2f2',
          color: val ? '#065f46' : '#991b1b',
          border: `1px solid ${val ? '#a7f3d0' : '#fecaca'}`
        }}
      >
        {val ? 'Available / Active' : 'Unavailable / Inactive'}
      </span>
    );
  }
  const str = String(val);
  if (str === 'Active' || str === 'Confirmed') {
    return (
      <span style={{ color: '#065f46', fontWeight: 600, backgroundColor: '#ecfdf5', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #a7f3d0', fontSize: '0.76rem' }}>
        {str}
      </span>
    );
  }
  if (str === 'Blocked' || str === 'Cancelled' || str === 'Inactive') {
    return (
      <span style={{ color: '#991b1b', fontWeight: 600, backgroundColor: '#fef2f2', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #fecaca', fontSize: '0.76rem' }}>
        {str}
      </span>
    );
  }
  return <strong style={{ color: 'var(--bistro-dark)', fontWeight: 600 }}>{str}</strong>;
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [activePreset, setActivePreset] = useState('last7');
  const [dateRange, setDateRange] = useState(() => getAuditDatePreset('last7'));
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [availableActions, setAvailableActions] = useState(CANONICAL_ACTIONS);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dateValidationError, setDateValidationError] = useState(null);

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Load distinct actions on mount
  useEffect(() => {
    let isMounted = true;
    getAuditActionTypes()
      .then((actions) => {
        if (isMounted) {
          const combined = Array.from(new Set([...CANONICAL_ACTIONS, ...(Array.isArray(actions) ? actions : [])]));
          setAvailableActions(combined);
        }
      })
      .catch(() => {
        if (isMounted) setAvailableActions(CANONICAL_ACTIONS);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(
    async (pageToLoad = currentPage, silent = false) => {
      const valError = validateAuditDateRange(dateRange.from, dateRange.to);
      if (valError) {
        setDateValidationError(valError);
        return;
      }
      setDateValidationError(null);

      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const response = await getAuditLogs({
          fromDate: dateRange.from ? `${dateRange.from}T00:00:00Z` : undefined,
          toDate: dateRange.to ? `${dateRange.to}T23:59:59Z` : undefined,
          actionType: actionTypeFilter || undefined,
          search: searchKeyword.trim() || undefined,
          page: pageToLoad,
          pageSize: pageSize
        });

        setLogs(response.items || []);
        setTotalCount(response.totalCount || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.page || 1);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to load audit logs. Please check your connection and retry.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRange, actionTypeFilter, searchKeyword, pageSize, currentPage]
  );

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, pageSize, dateRange, actionTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs(1);
  };

  const handlePresetSelect = (preset) => {
    setActivePreset(preset);
    setDateRange(getAuditDatePreset(preset));
    setCurrentPage(1);
  };

  const handleCustomDateChange = (field, val) => {
    setActivePreset('custom');
    setDateRange((prev) => ({ ...prev, [field]: val }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActivePreset('last7');
    setDateRange(getAuditDatePreset('last7'));
    setActionTypeFilter('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await getAuditLogs({
        fromDate: dateRange.from ? `${dateRange.from}T00:00:00Z` : undefined,
        toDate: dateRange.to ? `${dateRange.to}T23:59:59Z` : undefined,
        actionType: actionTypeFilter || undefined,
        search: searchKeyword.trim() || undefined,
        page: 1,
        pageSize: 1000
      });
      const records = response.items && response.items.length > 0 ? response.items : logs;
      await downloadAuditLogsExcel(
        records,
        {
          dateRange,
          actionType: actionTypeFilter,
          searchKeyword: searchKeyword.trim()
        },
        user?.email || 'admin@cinnamonbistro.com'
      );
    } catch {
      await downloadAuditLogsExcel(
        logs,
        {
          dateRange,
          actionType: actionTypeFilter,
          searchKeyword: searchKeyword.trim()
        },
        user?.email || 'admin@cinnamonbistro.com'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await getAuditLogs({
        fromDate: dateRange.from ? `${dateRange.from}T00:00:00Z` : undefined,
        toDate: dateRange.to ? `${dateRange.to}T23:59:59Z` : undefined,
        actionType: actionTypeFilter || undefined,
        search: searchKeyword.trim() || undefined,
        page: 1,
        pageSize: 500
      });
      const records = response.items && response.items.length > 0 ? response.items : logs;
      await downloadAuditLogsPdf(
        records,
        {
          dateRange,
          actionType: actionTypeFilter,
          searchKeyword: searchKeyword.trim()
        },
        user?.email || 'admin@cinnamonbistro.com'
      );
    } catch {
      await downloadAuditLogsPdf(
        logs,
        {
          dateRange,
          actionType: actionTypeFilter,
          searchKeyword: searchKeyword.trim()
        },
        user?.email || 'admin@cinnamonbistro.com'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedLog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="bistro-page-container" style={{ padding: '2rem 2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      <PageHeader
        title="Admin Audit Trail & Activity Log"
        subtitle="Authoritative, immutable tracking of administrative operations, user lifecycle updates, menu changes, and table modifications."
        badge="Security & Compliance"
      />

      {/* Date Validation Alert */}
      {dateValidationError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>⚠️</span>
          <span>{dateValidationError}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div
        className="bistro-card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid #e8e0d0',
          boxShadow: '0 2px 10px rgba(40, 30, 15, 0.03)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--bistro-muted)', marginRight: '0.25rem' }}>
              Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' }
            ].map((p) => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id)}
                  style={{
                    backgroundColor: isActive ? 'var(--bistro-gold, #c5a059)' : '#fcfaf6',
                    color: isActive ? '#fff' : 'var(--bistro-text, #2c251e)',
                    border: `1px solid ${isActive ? 'var(--bistro-gold, #c5a059)' : '#e8e0d0'}`,
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="audit-from-date" style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)' }}>
                From:
              </label>
              <input
                id="audit-from-date"
                type="date"
                value={dateRange.from}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                style={{
                  border: '1px solid #dcd3c1',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.82rem',
                  color: 'var(--bistro-text)',
                  backgroundColor: '#fff'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="audit-to-date" style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)' }}>
                To:
              </label>
              <input
                id="audit-to-date"
                type="date"
                value={dateRange.to}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                style={{
                  border: '1px solid #dcd3c1',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.82rem',
                  color: 'var(--bistro-text)',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

          {/* Action Type Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label htmlFor="audit-action-filter" style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)' }}>
              Action:
            </label>
            <select
              id="audit-action-filter"
              value={actionTypeFilter}
              onChange={(e) => {
                setActionTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.82rem',
                backgroundColor: '#fff',
                color: 'var(--bistro-text)'
              }}
            >
              <option value="">All Action Types</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {formatActionType(act).label} ({act})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search email, ID, details..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  border: '1px solid #dcd3c1',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem 0.35rem 2rem',
                  fontSize: '0.82rem',
                  width: '210px',
                  backgroundColor: '#fff'
                }}
              />
              <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                <IconSearch size={14} />
              </span>
            </div>
            <button
              type="submit"
              className="bistro-btn"
              style={{
                backgroundColor: 'var(--bistro-navy, #1e293b)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.38rem 0.75rem',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
            {(actionTypeFilter || searchKeyword || activePreset !== 'last7') && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  background: 'none',
                  border: '1px dashed #d1d5db',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  color: 'var(--bistro-muted)',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchLogs(currentPage, true)}
              disabled={isRefreshing}
              title="Refresh audit logs"
              style={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.38rem 0.65rem',
                cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <IconRefresh size={14} color="#4b5563" spinning={isRefreshing} />
            </button>
          </form>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchLogs(currentPage)}
            style={{
              backgroundColor: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '0.3rem 0.7rem',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div
        className="bistro-card"
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)'
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#fcfaf6',
            borderBottom: '1px solid #e8e0d0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <IconShieldCheck size={18} color="var(--bistro-gold, #c5a059)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--bistro-dark, #201a15)', margin: 0 }}>
              Immutable Audit Events
            </h2>
            <span
              style={{
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px'
              }}
            >
              {totalCount} Total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || totalCount === 0}
              title="Download styled audit report as an Excel spreadsheet"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--bistro-dark, #201a15)',
                cursor: isExporting || totalCount === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: totalCount === 0 ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (totalCount > 0 && !isExporting) {
                  e.currentTarget.style.backgroundColor = '#fdfbf7';
                  e.currentTarget.style.borderColor = 'var(--bistro-gold)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#dcd3c1';
              }}
            >
              <IconDownload size={14} color="#047857" />
              <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
            </button>

            {/* Download PDF Report Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || totalCount === 0}
              title="Download structured audit report as a branded PDF document"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--bistro-dark, #201a15)',
                cursor: isGeneratingPdf || totalCount === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: totalCount === 0 ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (totalCount > 0 && !isGeneratingPdf) {
                  e.currentTarget.style.backgroundColor = '#fdfbf7';
                  e.currentTarget.style.borderColor = '#b91c1c';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#dcd3c1';
              }}
            >
              <IconFileText size={14} color="#b91c1c" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <span style={{ fontSize: '0.82rem', color: 'var(--bistro-muted)', marginLeft: '0.25rem' }}>
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
            <div style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
              <IconRefresh size={28} color="var(--bistro-gold, #c5a059)" spinning={true} />
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>Loading authoritative audit log records...</p>
          </div>
        ) : logs.length === 0 ? (
          /* Empty State */
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--bistro-dark)', marginBottom: '0.35rem' }}>
              No Audit Records Found
            </h3>
            <p style={{ fontSize: '0.88rem', margin: '0 auto 1.25rem', maxWidth: '420px' }}>
              No administrative activity matched the current date window or action filter.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                backgroundColor: 'var(--bistro-gold, #c5a059)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 1rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Table Container */
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.88rem'
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f9f6f0', borderBottom: '1px solid #e8e0d0', color: '#4b5563' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Timestamp (UTC)</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Administrator</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Target Resource</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Result</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionMeta = formatActionType(log.actionType);
                  const isSuccess = log.result === 'Success';
                  const isDenied = log.result === 'Denied';

                  const resultBadge = {
                    bg: isSuccess ? '#ecfdf5' : isDenied ? '#fffbeb' : '#fef2f2',
                    color: isSuccess ? '#065f46' : isDenied ? '#92400e' : '#991b1b',
                    border: isSuccess ? '#a7f3d0' : isDenied ? '#fde68a' : '#fecaca'
                  };

                  return (
                    <tr
                      key={log.auditLogId}
                      style={{
                        borderBottom: '1px solid #f3ede2',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf8f4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap', color: 'var(--bistro-text)' }}>
                        <div style={{ fontWeight: 500 }}>
                          {new Date(log.timestampUtc).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>
                          {new Date(log.timestampUtc).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: actionMeta.bg,
                            color: actionMeta.color,
                            border: `1px solid ${actionMeta.border}`,
                            borderRadius: '6px',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em'
                          }}
                        >
                          {actionMeta.label}
                        </span>
                      </td>

                      {/* Administrator */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--bistro-dark)' }}>{log.adminEmail}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--bistro-muted)' }}>
                          ID: {log.adminId} • Role: {log.adminRole}
                        </div>
                      </td>

                      {/* Target Resource */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--bistro-text)' }}>{log.targetType}</div>
                        {log.targetId && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>ID: {log.targetId}</div>
                        )}
                      </td>

                      {/* Result */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: resultBadge.bg,
                            color: resultBadge.color,
                            border: `1px solid ${resultBadge.border}`,
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}
                        >
                          {log.result}
                        </span>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--bistro-muted)', fontSize: '0.8rem' }}>
                        {log.sourceService}
                      </td>

                      {/* Details View Button */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          style={{
                            backgroundColor: '#fff',
                            border: '1px solid #dcd3c1',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.78rem',
                            color: 'var(--bistro-navy, #1e293b)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4efe6';
                            e.currentTarget.style.borderColor = 'var(--bistro-gold)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#dcd3c1';
                          }}
                        >
                          <IconFileText size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#fcfaf6',
            borderTop: '1px solid #e8e0d0',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--bistro-muted)' }}>Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                backgroundColor: '#fff'
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.84rem', color: 'var(--bistro-dark)', fontWeight: 600, padding: '0 0.4rem' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #dcd3c1',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Read-Only Details Modal */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
        >
          <div
            className="bistro-card"
            style={{
              backgroundColor: '#fff',
              borderRadius: '14px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e8e0d0',
              padding: '1.75rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f3ede2', paddingBottom: '0.75rem' }}>
              <div>
                <h3 id="audit-modal-title" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--bistro-dark)' }}>
                  Audit Record #{selectedLog.auditLogId}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)' }}>
                  {formatActionType(selectedLog.actionType).label} • {new Date(selectedLog.timestampUtc).toUTCString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  color: '#6b7280'
                }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#fcfaf6', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f3ede2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)', display: 'block' }}>Administrator</span>
                <strong style={{ fontSize: '0.88rem', color: 'var(--bistro-dark)' }}>{selectedLog.adminEmail}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>ID: {selectedLog.adminId} ({selectedLog.adminRole})</div>
              </div>

              <div style={{ backgroundColor: '#fcfaf6', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f3ede2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)', display: 'block' }}>Target Resource</span>
                <strong style={{ fontSize: '0.88rem', color: 'var(--bistro-dark)' }}>{selectedLog.targetType}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>Target ID: {selectedLog.targetId || 'N/A'}</div>
              </div>

              <div style={{ backgroundColor: '#fcfaf6', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f3ede2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)', display: 'block' }}>Execution Result</span>
                <strong style={{ fontSize: '0.88rem', color: selectedLog.result === 'Success' ? '#065f46' : '#991b1b' }}>
                  {selectedLog.result}
                </strong>
              </div>

              <div style={{ backgroundColor: '#fcfaf6', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f3ede2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)', display: 'block' }}>Originating Service</span>
                <strong style={{ fontSize: '0.88rem', color: 'var(--bistro-dark)' }}>{selectedLog.sourceService}</strong>
                {selectedLog.ipAddress && <div style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>IP: {selectedLog.ipAddress}</div>}
              </div>
            </div>

            {/* Sanitized Operational Details */}
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--bistro-dark)', display: 'block', marginBottom: '0.45rem' }}>
                Operational Change Summary:
              </span>
              {(() => {
                let parsed = null;
                try {
                  parsed = JSON.parse(selectedLog.detailsJson || '{}');
                } catch {
                  parsed = null;
                }

                const entries = parsed && typeof parsed === 'object' ? Object.entries(parsed) : [];

                if (entries.length === 0) {
                  return (
                    <div style={{ backgroundColor: '#fcfaf6', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #ebdcc5', fontSize: '0.84rem', color: 'var(--bistro-muted)' }}>
                      {selectedLog.detailsJson || 'No additional change attributes recorded.'}
                    </div>
                  );
                }

                return (
                  <div style={{ backgroundColor: '#fcfaf6', borderRadius: '8px', border: '1px solid #ebdcc5', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <tbody>
                        {entries.map(([k, v], idx) => (
                          <tr
                            key={k}
                            style={{
                              borderBottom: idx < entries.length - 1 ? '1px solid #f0eae1' : 'none',
                              backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfaf6'
                            }}
                          >
                            <td style={{ padding: '0.55rem 0.85rem', width: '38%', color: '#6b7280', fontWeight: 600 }}>
                              {formatDetailKey(k)}
                            </td>
                            <td style={{ padding: '0.55rem 0.85rem' }}>
                              {renderDetailValue(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--bistro-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🔒</span>
                <span>Protected append-only audit record. Zero passwords, tokens, or credentials stored.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  backgroundColor: 'var(--bistro-navy, #1e293b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

