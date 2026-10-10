import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';
import { getUnreadCount } from '../../services/notificationService.js';

export default function TopBar({ onToggleMobileSidebar, onOpenLogoutModal }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.roles?.includes(ROLES.ADMIN);
  const isKitchen = user?.roles?.includes(ROLES.KITCHEN_STAFF);
  const isCustomer = !isAdmin && !isKitchen && !!user;

  const fetchUnread = useCallback(async () => {
    if (isCustomer) {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch {
        // silent fallback on network delay
      }
    }
  }, [isCustomer]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    const handleUpdate = () => fetchUnread();
    window.addEventListener('notifications:updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications:updated', handleUpdate);
    };
  }, [fetchUnread]);

  const getPortalLabel = () => {
    if (isAdmin) return 'Admin Portal';
    if (isKitchen) return 'Kitchen Portal';
    return 'Customer Dining';
  };

  const getBadgeClass = () => {
    if (isAdmin) return 'topbar-portal-badge admin';
    if (isKitchen) return 'topbar-portal-badge kitchen';
    return 'topbar-portal-badge';
  };

  const getUserInitials = () => {
    if (!user?.fullName) return 'U';
    const parts = user.fullName.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.fullName.slice(0, 2).toUpperCase();
  };

  const getDisplayRole = () => {
    if (isAdmin) return 'Administrator';
    if (isKitchen) return 'Kitchen Staff';
    return 'Dining Guest';
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="topbar-mobile-toggle"
          aria-label="Toggle navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link
          to={isKitchen ? '/kitchen' : '/portal'}
          className={getBadgeClass()}
          style={{ textDecoration: 'none' }}
          title={`Go to ${getPortalLabel()}`}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
          {getPortalLabel()}
        </Link>
      </div>

      <div className="topbar-right">
        {isCustomer && (
          <Link
            to="/notifications"
            className="topbar-notifications-btn"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : '0 unread notifications'}
            aria-label={`View notifications (${unreadCount} unread)`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span
              className={`topbar-notifications-badge ${unreadCount === 0 ? 'zero' : ''}`}
              title={unreadCount > 0 ? `${unreadCount} unread` : '0 unread'}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </Link>
        )}

        <Link to="/profile" className="topbar-user-pill" title="View your account profile">
          <div className="topbar-user-avatar">
            {getUserInitials()}
          </div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">{user?.fullName || 'Account'}</span>
            <span className="topbar-user-role">{getDisplayRole()}</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={onOpenLogoutModal}
          className="topbar-signout-btn"
          title="Sign out of system"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

