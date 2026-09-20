
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.roles?.includes(ROLES.ADMIN);
  const isKitchen = user?.roles?.includes(ROLES.KITCHEN_STAFF);

  const isActive = (path) => {
    if (
      path === '/portal' &&
      location.pathname === '/portal'
    ) {
      return true;
    }

    if (
      path === '/menu' &&
      location.pathname.startsWith('/menu')
    ) {
      return true;
    }

    if (
      path === '/orders' &&
      location.pathname.startsWith('/orders')
    ) {
      return true;
    }

    if (
      path === '/cart' &&
      location.pathname.startsWith('/cart')
    ) {
      return true;
    }

    if (
      path === '/admin' &&
      (
        location.pathname === '/admin' ||
        location.pathname === '/admin/tables' ||
        (isAdmin && location.pathname === '/tables')
      )
    ) {
      return true;
    }

    if (
      path === '/admin/menu' &&
      location.pathname.startsWith('/admin/menu')
    ) {
      return true;
    }

    if (
      path === '/kitchen' &&
      location.pathname === '/kitchen'
    ) {
      return true;
    }

    if (
      path === '/availability' &&
      (
        location.pathname === '/availability' ||
        location.pathname === '/reservations/new' ||
        location.pathname === '/reservations/confirmation'
      )
    ) {
      return true;
    }

    if (
      path === '/reservations/history' &&
      (
        location.pathname === '/reservations/history' ||
        location.pathname.startsWith('/reservations/')
      )
    ) {
      return true;
    }

    if (
      path === '/admin/reservations' &&
      location.pathname === '/admin/reservations'
    ) {
      return true;
    }

    if (
      path === '/admin/reports/reservations' &&
      location.pathname === '/admin/reports/reservations'
    ) {
      return true;
    }

    if (
      path === '/tables' &&
      location.pathname === '/tables'
    ) {
      return true;
    }

    if (
      path === '/profile' &&
      location.pathname === '/profile'
    ) {
      return true;
    }

    return false;
  };

  const dashboardIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  const menuIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 3v18" />
      <path d="M8 3v7a2 2 0 0 1-4 0V3" />
      <path d="M6 10v11" />
      <path d="M14 3v18" />
      <path d="M14 3c4 2 4 6 0 8" />
      <path d="M18 3v18" />
    </svg>
  );

  const cartIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );

  const searchIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  const calendarIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const tableIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 18v3" />
      <path d="M20 18v3" />
      <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
    </svg>
  );

  const profileIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const documentIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  const reportIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 12l7 7" />
    </svg>
  );

  const kitchenIcon = (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const homeIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  const customerNavItems = [
    {
      to: '/portal',
      label: 'Dining Dashboard',
      icon: dashboardIcon,
    },
    {
      to: '/menu',
      label: 'Browse Menu',
      icon: menuIcon,
    },
    {
      to: '/cart',
      label: 'My Cart',
      icon: cartIcon,
    },
    {
      to: '/orders',
      label: 'My Orders',
      icon: cartIcon,
    },
    {
      to: '/availability',
      label: 'Find a Table',
      icon: searchIcon,
    },
    {
      to: '/reservations/history',
      label: 'My Reservations',
      icon: calendarIcon,
    },
    {
      to: '/tables',
      label: 'View Tables',
      icon: tableIcon,
    },
    {
      to: '/profile',
      label: 'My Profile',
      icon: profileIcon,
    },
  ];

  const adminNavItems = [
    {
      to: '/portal',
      label: 'Admin Dashboard',
      icon: dashboardIcon,
    },
    {
      to: '/admin',
      label: 'Table Management',
      icon: tableIcon,
    },
    {
      to: '/admin/menu',
      label: 'Menu Management',
      icon: menuIcon,
    },
      {
    to: '/kitchen',
    label: 'Kitchen Management',
    icon: kitchenIcon,
  },
    {
      to: '/admin/reservations',
      label: 'Manage Bookings',
      icon: documentIcon,
    },
    {
      to: '/admin/reports/reservations',
      label: 'Reports & Analytics',
      icon: reportIcon,
    },
    {
      to: '/profile',
      label: 'System Profile',
      icon: profileIcon,
    },
  ];

  const kitchenNavItems = [
    {
      to: '/kitchen',
      label: 'Kitchen Queue',
      icon: kitchenIcon,
    },
    {
      to: '/tables',
      label: 'Dining Tables',
      icon: tableIcon,
    },
    {
      to: '/profile',
      label: 'Staff Profile',
      icon: profileIcon,
    },
  ];

  const navItems = isAdmin
    ? adminNavItems
    : isKitchen
      ? kitchenNavItems
      : customerNavItems;

  const brandTarget = isKitchen ? '/kitchen' : '/portal';

  const sectionLabel = isAdmin
    ? 'Admin Management'
    : isKitchen
      ? 'Kitchen Services'
      : 'Dining Services';

  return (
    <aside
      className={`app-sidebar ${
        isCollapsed ? 'collapsed' : ''
      } ${isMobileOpen ? 'mobile-open' : ''}`}
    >
      <Link
        to={brandTarget}
        className="sidebar-brand"
        onClick={onCloseMobile}
      >
        {isCollapsed ? (
          <div
            className="sidebar-brand-icon"
            title="Cinnamon Bistro"
          >
            CB
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <img
              src="/brand-logo.png"
              alt="Cinnamon Bistro"
              className="sidebar-brand-img"
            />
          </div>
        )}
      </Link>

      <div className="sidebar-section-title">
        {isCollapsed ? 'â€¢â€¢â€¢' : sectionLabel}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-nav-link ${
              isActive(item.to) ? 'active' : ''
            }`}
            onClick={onCloseMobile}
            title={item.label}
          >
            <span className="sidebar-nav-icon">
              {item.icon}
            </span>

            <span className="sidebar-nav-label">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link
          to="/"
          className="sidebar-nav-link"
          style={{ opacity: 0.8 }}
          onClick={onCloseMobile}
          title="Back to Landing Page"
        >
          <span className="sidebar-nav-icon">
            {homeIcon}
          </span>

          <span className="sidebar-nav-label">
            Public Website
          </span>
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          title={
            isCollapsed
              ? 'Expand Sidebar'
              : 'Collapse Sidebar'
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isCollapsed
                ? 'rotate(180deg)'
                : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>

          {!isCollapsed && (
            <span>Collapse Menu</span>
          )}
        </button>
      </div>
    </aside>
  );
}

