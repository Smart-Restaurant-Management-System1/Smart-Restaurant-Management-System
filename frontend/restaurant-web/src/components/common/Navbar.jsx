import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavLinks, getDefaultDashboardPath, getRoleBadgeInfo } from './navConfig';

export { getNavLinks, getDefaultDashboardPath, getRoleBadgeInfo };

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = getNavLinks(user, isAuthenticated);
  const homePath = getDefaultDashboardPath(user, isAuthenticated);
  const roleBadge = getRoleBadgeInfo(user?.roles);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.username || user?.email || 'User';

  return (
    <nav
      style={{
        backgroundColor: '#0b0d12',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
      aria-label="Main Navigation"
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        {/* Brand / Logo */}
        <Link
          to={homePath}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
            color: '#f3f4f6',
          }}
          aria-label="Restaurant Home"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f7e096 0%, #d4af37 50%, #9e7b1a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b0d12',
              fontWeight: '900',
              fontSize: '1.15rem',
              boxShadow: '0 2px 10px rgba(212, 175, 55, 0.35)',
            }}
          >
            ✦
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: '700',
                fontSize: '1.15rem',
                letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #fcedb6 0%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.15,
              }}
            >
              L'Étoile Dorée
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: '#9ca3af',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Smart Dining
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          className="navbar-desktop-links"
        >
          {isLoading ? (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '0.5rem' }}>
              Loading...
            </div>
          ) : (
            navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#d4af37' : '#d1d5db',
                    backgroundColor: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                    border: isActive
                      ? '1px solid rgba(212, 175, 55, 0.35)'
                      : '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#f3f4f6';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#d1d5db';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.label}
                </NavLink>
              );
            })
          )}
        </div>

        {/* Right Section: Auth State / User Profile / Sign Out */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {isLoading ? (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                borderTopColor: '#d4af37',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* User Identity & Role Badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  lineHeight: 1.25,
                }}
              >
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    color: '#f3f4f6',
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: roleBadge.color,
                    background: roleBadge.bg,
                    border: `1px solid ${roleBadge.border}`,
                    borderRadius: '4px',
                    padding: '0.1rem 0.45rem',
                    marginTop: '0.15rem',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                  }}
                >
                  {roleBadge.label}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Link
                to="/login"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#f3f4f6',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#0b0d12',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f7e096 0%, #d4af37 100%)',
                  boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
