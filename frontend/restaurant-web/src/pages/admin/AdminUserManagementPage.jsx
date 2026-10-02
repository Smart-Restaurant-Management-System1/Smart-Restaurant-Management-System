import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import {
  getAdminUsers,
  updateUserStatus,
  deleteUser,
} from '../../services/adminUserService';

// SVG Icons matching Cinnamon Bistro luxury tokens
const IconUsers = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconUserCheck = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

const IconShield = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconShieldAlert = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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
      transformOrigin: 'center',
    }}
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconBan = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IconCheck = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconTrash = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconClose = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconMail = ({ size = 13, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconPhone = ({ size = 13, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function AdminUserManagementPage() {
  const { user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('all');

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalStaff: 0,
    totalActive: 0,
    totalBlocked: 0,
    totalInactive: 0,
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    targetUser: null,
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Current admin ID
  const currentAdminId = useMemo(() => {
    if (!currentUser) return null;
    return currentUser.userId || currentUser.id || null;
  }, [currentUser]);

  // Load users callback
  const loadUsers = useCallback(async (overrides = {}) => {
    setLoading(true);
    setFeedback({ type: '', message: '' });

    const queryParams = {
      page: overrides.page !== undefined ? overrides.page : page,
      pageSize: overrides.pageSize !== undefined ? overrides.pageSize : pageSize,
      search: overrides.search !== undefined ? overrides.search : search,
      role: overrides.role !== undefined ? overrides.role : role,
      status: overrides.status !== undefined ? overrides.status : status,
    };

    try {
      const data = await getAdminUsers(queryParams);
      setUsers(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to load user records from identity service.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, role, status]);

  // Initial load
  useEffect(() => {
    loadUsers();
  }, [page, pageSize, role, status, loadUsers]);

  // Quick Filter Tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    switch (tab) {
      case 'customers':
        setRole('Customer');
        setStatus('All');
        break;
      case 'staff':
        setRole('KitchenStaff');
        setStatus('All');
        break;
      case 'active':
        setRole('All');
        setStatus('Active');
        break;
      case 'blocked':
        setRole('All');
        setStatus('Blocked');
        break;
      case 'all':
      default:
        setRole('All');
        setStatus('All');
        break;
    }
  };

  // Search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers({ page: 1, search });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setRole('All');
    setStatus('All');
    setActiveTab('all');
    setPage(1);
    loadUsers({ page: 1, search: '', role: 'All', status: 'All' });
  };

  // Open confirmation modal
  const openConfirmModal = (type, targetUser) => {
    if (!targetUser) return;
    if (currentAdminId && targetUser.userId === currentAdminId) {
      setFeedback({
        type: 'error',
        message: 'Action prohibited: You cannot block or delete your own active administrative account.',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      type,
      targetUser,
      reason: '',
    });
  };

  const closeConfirmModal = () => {
    if (actionLoading) return;
    setConfirmModal({
      isOpen: false,
      type: null,
      targetUser: null,
      reason: '',
    });
  };

  // Execute confirmed destructive action
  const handleExecuteAction = async () => {
    const { type, targetUser, reason } = confirmModal;
    if (!targetUser || !type) return;

    setActionLoading(true);
    try {
      if (type === 'block') {
        await updateUserStatus(targetUser.userId, 'Blocked', reason || 'Blocked by administrator.');
        setFeedback({
          type: 'success',
          message: `Account for ${targetUser.fullName} (${targetUser.email}) has been blocked successfully.`,
        });
      } else if (type === 'unblock') {
        await updateUserStatus(targetUser.userId, 'Active', reason || 'Restored by administrator.');
        setFeedback({
          type: 'success',
          message: `Access restored. ${targetUser.fullName} is now active and can sign in.`,
        });
      } else if (type === 'delete') {
        await deleteUser(targetUser.userId);
        setFeedback({
          type: 'success',
          message: `User ${targetUser.fullName} has been safely deactivated. Historical records preserved.`,
        });
      }
      closeConfirmModal();
      loadUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to execute administrative action.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Format initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="portal-page-content" style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Administrative Control Center"
        title={
          <>
            User &amp; Staff <em>Management.</em>
          </>
        }
        subtitle="Oversee registered dining customers and staff credentials, manage role privileges, toggle status, and inspect profiles in real-time."
        actions={
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            className="bistro-button-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.52rem 1.1rem',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
            title="Refresh user directory"
          >
            <IconRefresh size={15} spinning={loading} color="var(--bistro-gold)" />
            <span>{loading ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
        }
      />

      {/* 2. Feedback Alert Banner */}
      {feedback.message && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.88rem',
            fontWeight: 500,
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: feedback.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#86efac'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {feedback.type === 'error' ? (
              <IconShieldAlert size={18} color="#dc2626" />
            ) : (
              <IconCheck size={18} color="#16a34a" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'currentColor',
              padding: '0.2rem',
              opacity: 0.7,
            }}
          >
            <IconClose size={15} />
          </button>
        </div>
      )}

      {/* 3. Luxury Boutique KPI Cards (All in 1 Row) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* Card 1: Total Accounts */}
        <div
          className="bistro-card"
          onClick={() => handleTabChange('all')}
          style={{
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            overflow: 'hidden',
            border: activeTab === 'all' ? '2px solid #c5a059' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
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
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#faf5ec',
              border: '1px solid #e2d1ba',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8c6d3f',
              flexShrink: 0,
            }}
          >
            <IconUsers size={20} color="#8c6d3f" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bistro-muted)', fontWeight: 600, display: 'block' }}>
              Total Accounts
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--bistro-ink)', lineHeight: 1.1 }}>
              {metrics.totalUsers}
            </div>
          </div>
        </div>

        {/* Card 2: Customers */}
        <div
          className="bistro-card"
          onClick={() => handleTabChange('customers')}
          style={{
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            overflow: 'hidden',
            border: activeTab === 'customers' ? '2px solid #2563eb' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
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
              background: 'linear-gradient(90deg, #2563eb 0%, #93c5fd 100%)',
            }}
          />
          <div
            style={{
              width: '42px',
              height: '42px',
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
            <IconUserCheck size={20} color="#1d4ed8" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1d4ed8', fontWeight: 600, display: 'block' }}>
              Customers
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#1e3a8a', lineHeight: 1.1 }}>
              {metrics.totalCustomers}
            </div>
          </div>
        </div>

        {/* Card 3: Staff & Admin */}
        <div
          className="bistro-card"
          onClick={() => handleTabChange('staff')}
          style={{
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            overflow: 'hidden',
            border: activeTab === 'staff' ? '2px solid #7c3aed' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
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
              background: 'linear-gradient(90deg, #7c3aed 0%, #c4b5fd 100%)',
            }}
          />
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6d28d9',
              flexShrink: 0,
            }}
          >
            <IconShield size={20} color="#6d28d9" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6d28d9', fontWeight: 600, display: 'block' }}>
              Staff &amp; Admin
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#4c1d95', lineHeight: 1.1 }}>
              {metrics.totalStaff}
            </div>
          </div>
        </div>

        {/* Card 4: Active */}
        <div
          className="bistro-card"
          onClick={() => handleTabChange('active')}
          style={{
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            overflow: 'hidden',
            border: activeTab === 'active' ? '2px solid #10b981' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
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
              width: '42px',
              height: '42px',
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
            <IconCheck size={20} color="#047857" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#047857', fontWeight: 600, display: 'block' }}>
              Active Now
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#064e3b', lineHeight: 1.1 }}>
              {metrics.totalActive}
            </div>
          </div>
        </div>

        {/* Card 5: Blocked */}
        <div
          className="bistro-card"
          onClick={() => handleTabChange('blocked')}
          style={{
            padding: '1rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            position: 'relative',
            overflow: 'hidden',
            border: activeTab === 'blocked' ? '2px solid #ef4444' : '1px solid #e8e0d0',
            boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
            cursor: 'pointer',
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
              width: '42px',
              height: '42px',
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
            <IconShieldAlert size={20} color="#be123c" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be123c', fontWeight: 600, display: 'block' }}>
              Blocked
            </span>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.65rem', fontWeight: 700, color: '#881337', lineHeight: 1.1 }}>
              {metrics.totalBlocked}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Single-Line Unified Filter Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="bistro-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
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
            gap: '0.65rem',
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by full name, email, or telephone…"
              style={{
                width: '100%',
                padding: '0.48rem 2rem 0.48rem 2.2rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                  loadUsers({ page: 1, search: '' });
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

          {/* Role Dropdown */}
          <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.48rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="All">All Roles</option>
              <option value="Customer">Customer</option>
              <option value="KitchenStaff">Kitchen Staff</option>
              <option value="Admin">Administrator</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.48rem 0.65rem',
                backgroundColor: '#faf8f4',
                border: '1px solid #d9d0bf',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--bistro-ink)',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Blocked">Blocked Only</option>
              <option value="Inactive">Inactive / Deleted</option>
            </select>
          </div>

          {/* Apply Filter Button */}
          <button
            type="submit"
            className="bistro-button-gold"
            style={{
              padding: '0.48rem 1.15rem',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              height: '34px',
            }}
          >
            <IconSearch size={14} />
            <span>Apply</span>
          </button>

          {/* Reset Button */}
          {(search || role !== 'All' || status !== 'All') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="bistro-button-outline"
              style={{
                padding: '0.48rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                height: '34px',
              }}
            >
              <IconRefresh size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </form>

      {/* 5. Luxury User Directory Table */}
      <div
        className="bistro-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e8e0d0',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#faf6ee',
                  borderBottom: '2px solid #e8dec8',
                  fontSize: '0.76rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--bistro-muted)',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '0.85rem 1.25rem' }}>User Identity</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Assigned Role</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Contact Info</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Member Since</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--bistro-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                      <IconRefresh size={26} spinning={true} color="var(--bistro-gold)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Retrieving registered user credentials…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#faf5ec',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c2b59b',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <IconUsers size={24} />
                      </div>
                      <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: 'var(--bistro-ink)', margin: 0 }}>
                        No user accounts found
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--bistro-muted)', margin: 0 }}>
                        Try clearing or modifying your search keyword, role, or status filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((item, idx) => {
                  const isSelf = currentAdminId && item.userId === currentAdminId;
                  const primaryRole = item.roles?.[0] || 'Customer';
                  const isBlocked = item.status === 'Blocked' || (!item.isActive && item.status !== 'Inactive');
                  const isInactive = item.status === 'Inactive' || Boolean(item.deletedAt);
                  const isActive = item.status === 'Active' && item.isActive;

                  return (
                    <tr
                      key={item.userId}
                      style={{
                        borderBottom: idx === users.length - 1 ? 'none' : '1px solid #f0e8db',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Identity */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: isSelf ? '#eff6ff' : '#faf5ec',
                              border: isSelf ? '1.5px solid #93c5fd' : '1px solid #e0d6c5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              color: isSelf ? '#1d4ed8' : '#8c6d3f',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(item.fullName)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--bistro-ink)' }}>
                                {item.fullName}
                              </span>
                              {isSelf && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.12rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    border: '1px solid #bfdbfe',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                                color: 'var(--bistro-muted)',
                                marginTop: '0.15rem',
                              }}
                            >
                              <IconMail size={12} color="#8c6d3f" />
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.7rem',
                            borderRadius: '16px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            backgroundColor:
                              primaryRole === 'Admin'
                                ? '#fef3c7'
                                : primaryRole === 'KitchenStaff'
                                ? '#ede9fe'
                                : '#f1f5f9',
                            color:
                              primaryRole === 'Admin'
                                ? '#92400e'
                                : primaryRole === 'KitchenStaff'
                                ? '#5b21b6'
                                : '#334155',
                            border: `1px solid ${
                              primaryRole === 'Admin'
                                ? '#fde68a'
                                : primaryRole === 'KitchenStaff'
                                ? '#ddd6fe'
                                : '#cbd5e1'
                            }`,
                          }}
                        >
                          {primaryRole === 'Admin' ? (
                            <IconShield size={12} />
                          ) : primaryRole === 'KitchenStaff' ? (
                            <IconShieldAlert size={12} />
                          ) : (
                            <IconUsers size={12} />
                          )}
                          <span>{primaryRole}</span>
                        </span>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle', fontSize: '0.82rem' }}>
                        {item.phoneNumber ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--bistro-ink)' }}>
                            <IconPhone size={13} color="#8c6d3f" />
                            <span>{item.phoneNumber}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.78rem' }}>Not provided</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle' }}>
                        {isActive && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '16px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                display: 'inline-block',
                              }}
                            />
                            Active
                          </span>
                        )}
                        {isBlocked && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '16px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              backgroundColor: '#fff1f2',
                              color: '#9f1239',
                              border: '1px solid #fecdd3',
                            }}
                          >
                            <IconBan size={12} color="#e11d48" />
                            Blocked
                          </span>
                        )}
                        {isInactive && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '16px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Member Since */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle', fontSize: '0.82rem', color: 'var(--bistro-muted)' }}>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        {isSelf ? (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--bistro-muted)',
                              fontStyle: 'italic',
                              padding: '0.25rem 0.55rem',
                              backgroundColor: '#faf6ee',
                              borderRadius: '6px',
                              border: '1px solid #e8dec8',
                            }}
                          >
                            Current Admin
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                            {/* Block / Unblock Toggle */}
                            {isBlocked ? (
                              <button
                                type="button"
                                onClick={() => openConfirmModal('unblock', item)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: '1px solid #86efac',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                                title="Restore account login access"
                              >
                                <IconCheck size={13} color="#16a34a" />
                                <span>Unblock</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openConfirmModal('block', item)}
                                disabled={isInactive}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: isInactive ? 'not-allowed' : 'pointer',
                                  opacity: isInactive ? 0.4 : 1,
                                  border: '1px solid #fecdd3',
                                  backgroundColor: '#fff1f2',
                                  color: '#be123c',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isInactive) e.currentTarget.style.backgroundColor = '#ffe4e6';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isInactive) e.currentTarget.style.backgroundColor = '#fff1f2';
                                }}
                                title="Restrict account from protected access"
                              >
                                <IconBan size={13} color="#be123c" />
                                <span>Block</span>
                              </button>
                            )}

                            {/* Safe Deletion Button */}
                            <button
                              type="button"
                              onClick={() => openConfirmModal('delete', item)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.35rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff5f5')}
                              title="Safely deactivate and soft delete account"
                            >
                              <IconTrash size={14} color="#dc2626" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#faf6ee',
              borderTop: '1px solid #e8dec8',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.82rem',
              color: 'var(--bistro-muted)',
            }}
          >
            <div>
              Showing{' '}
              <strong style={{ color: 'var(--bistro-ink)' }}>
                {Math.min((page - 1) * pageSize + 1, totalCount)}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--bistro-ink)' }}>
                {Math.min(page * pageSize, totalCount)}
              </strong>{' '}
              of <strong style={{ color: 'var(--bistro-ink)' }}>{totalCount}</strong> user accounts
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1 || loading}
                className="bistro-button-outline"
                style={{
                  padding: '0.32rem 0.75rem',
                  fontSize: '0.78rem',
                  opacity: page <= 1 ? 0.4 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Page <span style={{ color: 'var(--bistro-gold)' }}>{page}</span> of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="bistro-button-outline"
                style={{
                  padding: '0.32rem 0.75rem',
                  fontSize: '0.78rem',
                  opacity: page >= totalPages ? 0.4 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Destructive Action Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.targetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(20, 15, 10, 0.65)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="bistro-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '1.65rem',
              borderRadius: '16px',
              border: '1px solid #e8e0d0',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Modal Top Accent Strip */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background:
                  confirmModal.type === 'unblock'
                    ? 'linear-gradient(90deg, #10b981 0%, #6ee7b7 100%)'
                    : 'linear-gradient(90deg, #ef4444 0%, #fca5a5 100%)',
              }}
            />

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: confirmModal.type === 'unblock' ? '#dcfce7' : '#fee2e2',
                    color: confirmModal.type === 'unblock' ? '#166534' : '#991b1b',
                  }}
                >
                  {confirmModal.type === 'unblock' ? (
                    <IconCheck size={18} color="#166534" />
                  ) : confirmModal.type === 'block' ? (
                    <IconBan size={18} color="#991b1b" />
                  ) : (
                    <IconTrash size={18} color="#991b1b" />
                  )}
                </div>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: 'var(--bistro-ink)', margin: 0 }}>
                  {confirmModal.type === 'block'
                    ? 'Confirm Account Block'
                    : confirmModal.type === 'unblock'
                    ? 'Restore Account Access'
                    : 'Confirm Account Removal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={actionLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0.2rem',
                }}
              >
                <IconClose size={16} />
              </button>
            </div>

            {/* Target Account Summary */}
            <div
              style={{
                backgroundColor: '#faf6ee',
                border: '1px solid #e8dec8',
                borderRadius: '8px',
                padding: '0.8rem 1rem',
                marginBottom: '0.9rem',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--bistro-muted)' }}>Target User:</span>
                <strong style={{ color: 'var(--bistro-ink)' }}>{confirmModal.targetUser.fullName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--bistro-muted)' }}>Email Address:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--bistro-ink)' }}>{confirmModal.targetUser.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--bistro-muted)' }}>Role:</span>
                <span style={{ fontWeight: 600, color: 'var(--bistro-gold)' }}>
                  {confirmModal.targetUser.roles?.[0] || 'Customer'}
                </span>
              </div>
            </div>

            {/* Warning Text */}
            <div style={{ fontSize: '0.82rem', lineHeight: '1.45', marginBottom: '1.15rem' }}>
              {confirmModal.type === 'block' && (
                <p style={{ color: '#991b1b', margin: 0 }}>
                  <strong>Security Alert:</strong> Blocking this user immediately revokes access to the Cinnamon Bistro portal. Any attempts to sign in will be rejected until explicitly unblocked by an administrator.
                </p>
              )}
              {confirmModal.type === 'unblock' && (
                <p style={{ color: '#166534', margin: 0 }}>
                  This action will restore normal dining portal access for this customer or staff account.
                </p>
              )}
              {confirmModal.type === 'delete' && (
                <p style={{ color: '#991b1b', margin: 0 }}>
                  <strong>Data Integrity Protection:</strong> Deactivating this user will safely soft-delete the account. All past dining reservations, table orders, and receipts will remain intact in the system for auditing and compliance.
                </p>
              )}
            </div>

            {/* Optional Reason Input */}
            <div style={{ marginBottom: '1.35rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--bistro-ink)',
                  marginBottom: '0.3rem',
                }}
              >
                Administrative Reason / Audit Note (Optional):
              </label>
              <input
                type="text"
                value={confirmModal.reason}
                onChange={(e) => setConfirmModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Requested by customer, suspicious activity, etc."
                style={{
                  width: '100%',
                  padding: '0.52rem 0.7rem',
                  backgroundColor: '#faf8f4',
                  border: '1px solid #d9d0bf',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={actionLoading}
                className="bistro-button-outline"
                style={{
                  padding: '0.48rem 1.1rem',
                  fontSize: '0.82rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                style={{
                  padding: '0.48rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  color: '#ffffff',
                  backgroundColor:
                    confirmModal.type === 'unblock'
                      ? '#16a34a'
                      : '#dc2626',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {actionLoading
                  ? 'Processing…'
                  : confirmModal.type === 'delete'
                  ? 'Confirm Deactivation'
                  : confirmModal.type === 'block'
                  ? 'Confirm Block'
                  : 'Restore Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
