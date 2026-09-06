import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-container" style={{ padding: '2.5rem', color: '#111827', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              Welcome, {user?.fullName || 'Guest'}
            </h1>
            <p style={{ color: '#6b7280' }}>
              Customer Dining Portal — View reservations, digital menus, and orders.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              to="/profile"
              className="btn-jelly-primary"
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              My Profile
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="btn-jelly-secondary"
              style={{
                padding: '0.65rem 1.15rem',
                fontSize: '0.88rem',
                color: '#111827',
                backgroundColor: '#ffffff',
                borderColor: '#111827',
                fontWeight: '600',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div style={{ background: '#fdfaf0', border: '1px solid #d4af37', padding: '1.25rem', borderRadius: '10px' }}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.roles?.join(', ')}</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logoutModalTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2
              id="logoutModalTitle"
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.5rem',
              }}
            >
              Sign Out
            </h2>
            <p
              style={{
                fontSize: '0.92rem',
                color: '#6b7280',
                marginBottom: '1.75rem',
                lineHeight: '1.5',
              }}
            >
              Are you sure you want to sign out of your account?
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn-jelly-secondary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  flex: 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="btn-jelly-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  backgroundColor: '#111827',
                  color: '#ffffff',
                  background: '#111827',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  flex: 1,
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
