import React from 'react';

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logoutModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 13, 18, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
          padding: '2.2rem 2rem',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          animation: 'glassCardReveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            color: '#d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '1px solid rgba(212, 175, 55, 0.3)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <h2
          id="logoutModalTitle"
          style={{
            fontSize: '1.35rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.4rem',
            letterSpacing: '-0.01em',
          }}
        >
          Sign Out of Account
        </h2>
        <p
          style={{
            fontSize: '0.92rem',
            color: '#6b7280',
            marginBottom: '1.75rem',
            lineHeight: '1.5',
          }}
        >
          Are you sure you want to end your active session? You will need to log back in to access your dashboard.
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
            onClick={onClose}
            className="btn-jelly-secondary"
            style={{
              padding: '0.7rem 1.25rem',
              fontSize: '0.9rem',
              flex: 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-jelly-primary"
            style={{
              padding: '0.7rem 1.25rem',
              fontSize: '0.9rem',
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
  );
}

