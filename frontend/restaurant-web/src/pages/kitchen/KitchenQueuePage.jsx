import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function KitchenQueuePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="kitchen-container"
      style={{
        padding: '2.5rem 1.5rem',
        color: '#111827',
        background: '#ffffff',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#d4af37',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Operations Portal
            </span>
            <h1
              style={{
                fontSize: '2.2rem',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                marginBottom: '0.4rem',
                color: '#111827',
              }}
            >
              Kitchen Order Queue
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.98rem', margin: 0 }}>
              Live order tickets and food preparation terminal.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/tables" className="btn-jelly-secondary" style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem', textDecoration: 'none' }}>
              View Tables
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="btn-jelly-secondary"
              style={{
                padding: '0.65rem 1.15rem', fontSize: '0.88rem', color: '#111827', backgroundColor: '#ffffff',
                borderColor: '#111827', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* Staff Info Banner */}
        <div
          style={{
            background: '#fdfaf0',
            border: '1px solid #d4af37',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937' }}>
              <strong>Staff Member:</strong> {user?.fullName || 'Kitchen Staff'} ({user?.email || 'staff@bistro.com'})
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#856404' }}>
              <strong>Terminal:</strong> Culinary Operations Queue
            </p>
          </div>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#d4af37',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            Kitchen Session
          </span>
        </div>

        {/* Placeholder Queue Content */}
        <div
          style={{
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: '12px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
              <line x1="6" y1="17" x2="18" y2="17" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '0.4rem' }}>
            No Active Orders in Queue
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            New customer kitchen tickets will populate here in real-time as orders are placed.
          </p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kitchenLogoutModalTitle"
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
              id="kitchenLogoutModalTitle"
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
              Are you sure you want to sign out of the kitchen queue terminal?
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
