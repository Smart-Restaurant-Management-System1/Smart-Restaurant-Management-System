import React from 'react';

/**
 * Reusable Confirmation Modal matching Cinnamon Bistro luxury design standards.
 * Replaces browser window.confirm with an elegant centered dialog.
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action? This cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'gold' | 'default'
  loading = false,
  icon,
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const defaultIcon = isDanger ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8c6736" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmationModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(26, 20, 12, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1.25rem',
      }}
    >
      <div
        className="bistro-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '2.2rem 1.85rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(40, 30, 15, 0.25)',
          textAlign: 'center',
          border: '1px solid #ebdcc5',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
        }}
      >
        {/* Top Gradient Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: isDanger
              ? 'linear-gradient(90deg, #be123c 0%, #f43f5e 50%, #be123c 100%)'
              : 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
          }}
        />

        {/* Modal Icon Badge */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: isDanger ? '#fff1f2' : '#faf5ec',
            border: isDanger ? '1px solid #fecdd3' : '1px solid #eedfc9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: isDanger ? '0 4px 12px rgba(190, 18, 60, 0.1)' : '0 4px 12px rgba(140, 103, 54, 0.1)',
          }}
        >
          {icon || defaultIcon}
        </div>

        {/* Modal Title */}
        <h3
          id="confirmationModalTitle"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.32rem',
            fontWeight: 700,
            color: 'var(--bistro-ink, #28251f)',
            margin: '0 0 0.5rem 0',
            lineHeight: 1.25,
          }}
        >
          {title}
        </h3>

        {/* Modal Message */}
        <p
          style={{
            fontSize: '0.86rem',
            color: 'var(--bistro-muted, #6b6357)',
            lineHeight: 1.55,
            margin: '0 0 1.75rem 0',
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="bistro-button-outline"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              flex: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              flex: 1,
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              color: '#ffffff',
              backgroundColor: isDanger ? '#be123c' : '#8c6736',
              background: isDanger
                ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)'
                : 'linear-gradient(135deg, #c5a059 0%, #8c6736 100%)',
              boxShadow: isDanger
                ? '0 4px 14px rgba(190, 18, 60, 0.3)'
                : '0 4px 14px rgba(140, 103, 54, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
