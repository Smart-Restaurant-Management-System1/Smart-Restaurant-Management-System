import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin');

  return (
    <div className="portal-page-content">
      {/* Unified Page Header with Landing Page Serif & Italic Flair */}
      <PageHeader
        eyebrow={isAdmin ? 'Admin Dashboard' : 'Dining Portal'}
        title={<>A place to gather. A moment to <em>savour.</em></>}
        subtitle={`Welcome back, ${user?.fullName || 'valued guest'}. Manage your table reservations, explore seating availability, and keep your dining profile updated.`}
        actions={
          <Link
            to="/availability"
            className="bistro-button-gold"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Find a Table
          </Link>
        }
      />

      {/* Account Info Banner - Warm Cream Landing Aesthetic */}
      <div className="bistro-info-banner">
        <div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--bistro-ink)' }}>
            <strong>{isAdmin ? 'Admin Account:' : 'Guest Account:'}</strong> {user?.fullName || 'Guest'} ({user?.email})
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--bistro-bronze)' }}>
            <strong>Access Level:</strong> {user?.roles?.join(', ') || 'Customer'} (Online Table Booking & Reservation History)
          </p>
        </div>
        <span className="bistro-info-tag">
          {isAdmin ? 'Administrator' : 'Active Member'}
        </span>
      </div>

      {/* Quick Action Navigation Grid (Matching .bistro-feature from Landing Page) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Card 1: Find a Table */}
        <div className="bistro-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#eee3cf',
                  color: '#6b532f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: 'var(--bistro-bronze)' }}>01</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0' }}>
              Book a Dining Table
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
              Search real-time availability for dates, time slots, and party sizes to reserve your dining experience.
            </p>
          </div>
          <Link
            to="/availability"
            className="bistro-button-gold"
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            Search Availability <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Card 2: My Reservations */}
        <div className="bistro-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#eee3cf',
                  color: '#6b532f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: 'var(--bistro-bronze)' }}>02</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0' }}>
              My Reservations
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
              Check your upcoming reservations, review visit history, and manage or reschedule existing bookings.
            </p>
          </div>
          <Link
            to="/reservations/history"
            className="bistro-button-dark"
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            View Bookings <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Card 3: View Tables */}
        <div className="bistro-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#eee3cf',
                  color: '#6b532f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3" />
                  <path d="M20 18v3" />
                  <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                </svg>
              </div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: 'var(--bistro-bronze)' }}>03</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0' }}>
              Restaurant Tables
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
              Browse the restaurant dining layout, active seating configurations, and seating capacities.
            </p>
          </div>
          <Link
            to="/tables"
            className="bistro-button-outline"
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            Explore Tables <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Card 4: Customer Profile */}
        <div className="bistro-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#eee3cf',
                  color: '#6b532f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: 'var(--bistro-bronze)' }}>04</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0' }}>
              Personal Profile
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--bistro-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
              Update your personal contact details, verified email address, and dining notification settings.
            </p>
          </div>
          <Link
            to="/profile"
            className="bistro-button-outline"
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            Edit Profile <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
