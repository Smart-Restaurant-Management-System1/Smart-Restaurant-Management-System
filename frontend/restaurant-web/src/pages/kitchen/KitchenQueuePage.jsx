import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';

export default function KitchenQueuePage() {
  const { user } = useAuth();

  return (
    <div className="kitchen-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Operations Portal"
        title={<>Kitchen Order <em>Queue</em></>}
        subtitle="Live order tickets, food preparation status, and kitchen fulfillment terminal."
        actions={
          <Link to="/tables" className="bistro-button-outline">
            View Tables
          </Link>
        }
      />

      {/* Staff Info Banner */}
      <div className="bistro-info-banner">
        <div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--bistro-ink)' }}>
            <strong>Staff Member:</strong> {user?.fullName || 'Kitchen Staff'} ({user?.email || 'staff@bistro.com'})
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--bistro-bronze)' }}>
            <strong>Terminal:</strong> Culinary Operations Queue
          </p>
        </div>
        <span className="bistro-info-tag">
          Kitchen Session
        </span>
      </div>

      {/* Placeholder Queue Content */}
      <div className="bistro-card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#eee3cf',
            color: '#6b532f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>
          No Active Orders in <em>Queue</em>
        </h3>
        <p style={{ color: 'var(--bistro-muted)', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto' }}>
          New customer kitchen tickets will populate here in real-time as orders are placed.
        </p>
      </div>
    </div>
  );
}
