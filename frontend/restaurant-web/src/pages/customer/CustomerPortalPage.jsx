import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/profile"
              style={{
                padding: '0.65rem 1.25rem',
                background: 'var(--gold-gradient)',
                color: '#11141a',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
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
              onClick={handleLogout}
              style={{
                padding: '0.65rem 1.1rem',
                background: '#ffffff',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
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
    </div>
  );
}
