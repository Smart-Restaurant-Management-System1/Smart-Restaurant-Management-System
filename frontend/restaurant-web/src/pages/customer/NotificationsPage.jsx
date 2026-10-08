import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService.js';
import './notifications.css';

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const fetchNotifications = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const data = await getNotifications({ page, pageSize, unreadOnly });
        if (isMountedRef.current) {
          setNotifications(data?.notifications || []);
          setTotalCount(data?.totalCount || 0);
          setUnreadCount(data?.unreadCount || 0);
          setTotalPages(data?.totalPages || 1);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err?.response?.data?.message ||
              'Unable to load your notifications. Please check your connection and try again.'
          );
        }
      } finally {
        if (isMountedRef.current && showLoading) {
          setIsLoading(false);
        }
      }
    },
    [page, pageSize, unreadOnly]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications(true);

    // Light polling every 30 seconds to fetch new updates without full page reloads
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications:updated'));
      }
    } catch {
      fetchNotifications(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications:updated'));
      }
    } catch {
      fetchNotifications(false);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleTabChange = (onlyUnread) => {
    setUnreadOnly(onlyUnread);
    setPage(1);
  };

  const getEventIcon = (eventType, refType) => {
    if (refType === 'Reservation' || eventType?.startsWith('Reservation')) {
      return { icon: '📅', class: 'reservation', label: 'Reservation' };
    }
    if (refType === 'Order' || eventType?.startsWith('Order')) {
      return { icon: '🍽️', class: 'order', label: 'Order' };
    }
    if (refType === 'Payment' || eventType?.startsWith('Payment')) {
      return { icon: '💳', class: 'payment', label: 'Payment' };
    }
    return { icon: '🔔', class: 'default', label: 'Alert' };
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Ensure UTC interpretation if no timezone offset or Z suffix is present
      const normalizedStr =
        typeof dateStr === 'string' &&
        !dateStr.endsWith('Z') &&
        !dateStr.includes('+') &&
        !dateStr.includes(' -')
          ? `${dateStr}Z`
          : dateStr;
      const date = new Date(normalizedStr);
      const now = new Date();
      const diffMs = Math.max(0, now - date);
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleNavigateRef = (n) => {
    if (n.referenceType === 'Reservation') {
      navigate('/reservations/history');
    } else if (n.referenceType === 'Order' || n.referenceType === 'Payment') {
      navigate('/orders');
    }
  };

  return (
    <main className="notifications-page">
      {/* Luxury Page Header matching rest of Cinnamon Bistro customer portal */}
      <PageHeader
        title="Notifications & Alerts"
        subtitle="Review your dining updates, table reservation confirmations, and kitchen order progress."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="notification-link-btn"
              onClick={() => fetchNotifications(true)}
              title="Refresh notifications"
              style={{ background: '#ffffff', color: '#493628', borderColor: '#eedfc9' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-link-btn"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                title="Mark all notifications as read"
                style={{
                  background: 'linear-gradient(135deg, #c5a059 0%, #a87942 100%)',
                  color: '#ffffff',
                  borderColor: 'transparent',
                  boxShadow: '0 2px 6px rgba(197, 160, 89, 0.35)',
                }}
              >
                <span>{isMarkingAll ? 'Marking...' : `Mark All Read (${unreadCount})`}</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Summary Cards Strip matching OrderTrackingPage / CustomerPortalPage */}
      <div className="notifications-summary-strip">
        <div className="notifications-stat-card">
          <div className="notifications-stat-accent" />
          <div className="notifications-stat-icon">🔔</div>
          <div className="notifications-stat-info">
            <span className="notifications-stat-label">Total Notifications</span>
            <span className="notifications-stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="notifications-stat-card">
          <div className="notifications-stat-accent" />
          <div className="notifications-stat-icon unread">✉️</div>
          <div className="notifications-stat-info">
            <span className="notifications-stat-label">Unread Alerts</span>
            <span className={`notifications-stat-value ${unreadCount > 0 ? 'highlight' : ''}`}>
              {unreadCount}
            </span>
          </div>
        </div>

        <div className="notifications-stat-card">
          <div className="notifications-stat-accent" />
          <div className="notifications-stat-icon status">✨</div>
          <div className="notifications-stat-info">
            <span className="notifications-stat-label">Account Status</span>
            <span className="notifications-stat-value text">
              {unreadCount === 0 ? 'All Caught Up' : `${unreadCount} Pending`}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar with Filter Tabs */}
      <div className="notifications-toolbar">
        <div className="notifications-tabs">
          <button
            type="button"
            className={`notifications-tab-btn ${!unreadOnly ? 'active' : ''}`}
            onClick={() => handleTabChange(false)}
          >
            All Notifications ({totalCount})
          </button>
          <button
            type="button"
            className={`notifications-tab-btn ${unreadOnly ? 'active' : ''}`}
            onClick={() => handleTabChange(true)}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        <span className="notifications-counter-text">
          Showing {notifications.length} of {totalCount} updates
        </span>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="notifications-loading-state">
          <p>Loading your notifications...</p>
        </div>
      ) : error ? (
        <div className="notifications-error-state">
          <h3>Failed to Load Notifications</h3>
          <p>{error}</p>
          <button
            type="button"
            className="notification-link-btn"
            onClick={() => fetchNotifications(true)}
          >
            Try Again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty-state">
          <div className="notifications-empty-icon">🔔</div>
          <h3>{unreadOnly ? 'No Unread Notifications' : 'No Notifications Yet'}</h3>
          <p>
            {unreadOnly
              ? 'You are all caught up! Switch to "All Notifications" to review past updates.'
              : 'When you reserve a table or place a dining order, you will receive timely notifications here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="notifications-list">
            {notifications.map((n) => {
              const iconMeta = getEventIcon(n.eventType, n.referenceType);
              return (
                <article
                  key={n.id}
                  className={`notification-card ${!n.isRead ? 'unread' : 'read'}`}
                >
                  <div className={`notification-icon-wrapper ${iconMeta.class}`}>
                    <span>{iconMeta.icon}</span>
                  </div>

                  <div className="notification-content">
                    <div className="notification-meta-top">
                      <h4 className="notification-title">
                        {!n.isRead && <span className="notification-unread-dot" />}
                        {n.title}
                      </h4>
                      <span className="notification-time">
                        {formatTimestamp(n.createdAt)}
                      </span>
                    </div>

                    <p className="notification-message">{n.message}</p>

                    <div className="notification-footer">
                      {n.referenceCode ? (
                        <span className="notification-ref-badge">
                          Ref: {n.referenceCode}
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="notifications-links">
                        {(n.referenceType === 'Reservation' || n.referenceType === 'Order' || n.referenceType === 'Payment') && (
                          <button
                            type="button"
                            className="notification-link-btn"
                            onClick={() => handleNavigateRef(n)}
                          >
                            {n.referenceType === 'Reservation' ? 'View Reservation →' : 'Track Order →'}
                          </button>
                        )}

                        {!n.isRead && (
                          <button
                            type="button"
                            className="notification-mark-read-btn"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="notifications-pagination">
              <button
                type="button"
                className="notifications-pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ← Previous
              </button>
              <span className="notifications-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="notifications-pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
