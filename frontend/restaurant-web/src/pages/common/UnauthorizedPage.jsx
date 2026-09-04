import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturn = () => {
    if (user?.roles?.includes(ROLES.ADMIN)) {
      navigate('/admin');
    } else if (user?.roles?.includes(ROLES.KITCHEN_STAFF)) {
      navigate('/kitchen');
    } else {
      navigate('/portal');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0d12',
      color: '#f3f4f6',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#ffffff',
        color: '#111827',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: '700', marginBottom: '0.75rem', color: '#111827' }}>
          403 - Access Denied
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
          Your current account role does not have authorization to view this restricted page. If you believe this is an error, please contact restaurant management.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="fullscreen-btn"
            onClick={handleReturn}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--gold-gradient)',
              color: '#11141a',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
