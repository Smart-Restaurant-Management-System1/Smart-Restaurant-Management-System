import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import LogoutModal from './LogoutModal';

export default function AppLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Left Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Viewport */}
      <div className={`app-main-viewport ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Upper Bar */}
        <TopBar
          onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
          onOpenLogoutModal={() => setShowLogoutModal(true)}
        />

        {/* Dynamic Page Content */}
        <main className="app-main-content">
          {children || <Outlet />}
        </main>
      </div>

      {/* Reusable Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}
