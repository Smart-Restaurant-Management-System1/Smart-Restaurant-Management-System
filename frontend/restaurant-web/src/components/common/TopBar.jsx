import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';

export default function TopBar({ onToggleMobileSidebar, onOpenLogoutModal }) {
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes(ROLES.ADMIN);
  const isKitchen = user?.roles?.includes(ROLES.KITCHEN_STAFF);

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

        <span className={getBadgeClass()}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
          {getPortalLabel()}
        </span>
      </div>

      <div className="topbar-right">
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

