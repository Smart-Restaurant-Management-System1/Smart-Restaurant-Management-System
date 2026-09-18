import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';
import PageHeader from '../../components/common/PageHeader';

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes(ROLES.ADMIN);

  // Admin dashboard cards: relevant administrative modules
  const adminCards = [
    {
      number: '01',
      title: 'Table Management',
      description: 'Configure restaurant floor layouts, seating capacities, table numbers, and toggle real-time availability.',
      link: '/admin',
      buttonLabel: 'Manage Tables',
      buttonClass: 'bistro-button-gold',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18v3" />
          <path d="M20 18v3" />
          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Menu & Dishes',
      description: 'Curate culinary dishes, set prices, update dietary classifications, and toggle real-time menu availability.',
      link: '/admin/menu',
      buttonLabel: 'Manage Menu',
      buttonClass: 'bistro-button-gold',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3v18" />
          <path d="M8 3v7a2 2 0 0 1-4 0V3" />
          <path d="M6 10v11" />
          <path d="M14 3v18" />
          <path d="M14 3c4 2 4 6 0 8" />
          <path d="M18 3v18" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Manage Bookings',
      description: 'Review guest dining reservations, verify check-ins, manage seating schedules, and track booking statuses.',
      link: '/admin/reservations',
      buttonLabel: 'View Bookings',
      buttonClass: 'bistro-button-dark',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'Reports & Analytics',
      description: 'Analyze reservation trends, peak dining hours, cancellation distributions, and export official CSV/Excel reports.',
      link: '/admin/reports/reservations',
      buttonLabel: 'View Reports',
      buttonClass: 'bistro-button-outline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      number: '05',
      title: 'Kitchen Queue',
      description: 'Monitor live kitchen orders, track dish preparation stages, and review ticket fulfillment queues in real-time.',
      link: '/kitchen',
      buttonLabel: 'Kitchen Display',
      buttonClass: 'bistro-button-outline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      number: '06',
      title: 'System Profile',
      description: 'Manage administrative account credentials, verified contact details, and system security preferences.',
      link: '/profile',
      buttonLabel: 'Edit Profile',
      buttonClass: 'bistro-button-outline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  // Customer portal cards: dining menu, availability, reservations, tables, profile
  const customerCards = [
    {
      number: '01',
      title: 'Explore Our Menu',
      description: 'Browse handcrafted artisanal dishes, chef specials, beverage cellar, and dietary options curated for fine dining.',
      link: '/menu',
      buttonLabel: 'Browse Menu',
      buttonClass: 'bistro-button-gold',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3v18" />
          <path d="M8 3v7a2 2 0 0 1-4 0V3" />
          <path d="M6 10v11" />
          <path d="M14 3v18" />
          <path d="M14 3c4 2 4 6 0 8" />
          <path d="M18 3v18" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Book a Dining Table',
      description: 'Check real-time table availability for your planned date, time slot, and party size to reserve an exquisite experience.',
      link: '/availability',
      buttonLabel: 'Search Availability',
      buttonClass: 'bistro-button-gold',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'My Reservations',
      description: 'Track upcoming dining visits, review historical table bookings, and easily manage or reschedule reservations.',
      link: '/reservations/history',
      buttonLabel: 'View Bookings',
      buttonClass: 'bistro-button-dark',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'Restaurant Tables',
      description: 'Explore our dining room layout, active seating configurations, ambient terrace tables, and party capacities.',
      link: '/tables',
      buttonLabel: 'Explore Tables',
      buttonClass: 'bistro-button-outline',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18v3" />
          <path d="M20 18v3" />
          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
        </svg>
      ),
    },
    {
      number: '05',
      title: 'Personal Profile',
      description: 'Manage your verified account credentials, contact information, dining preferences, and security settings.',
      link: '/profile',
      buttonLabel: 'Edit Profile',
      buttonClass: 'bistro-button-outline',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const cards = isAdmin ? adminCards : customerCards;

  return (
    <div className="portal-page-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow={isAdmin ? 'Admin Administration' : 'Dining Portal'}
        title={
          isAdmin ? (
            <>Restaurant Operations & <em>Control Center.</em></>
          ) : (
            <>A place to gather. A moment to <em>savour.</em></>
          )
        }
        subtitle={
          isAdmin
            ? `Welcome back, ${user?.fullName || 'Administrator'}. Oversee table allocations, curate culinary menus, supervise customer reservations, and monitor analytics.`
            : `Welcome back, ${user?.fullName || 'valued guest'}. Manage your table reservations, explore seating availability, and keep your dining profile updated.`
        }
        actions={
          isAdmin ? (
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <Link
                to="/admin/menu"
                className="bistro-button-gold"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Manage Dishes
              </Link>
              <Link
                to="/admin"
                className="bistro-button-outline"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3" />
                  <path d="M20 18v3" />
                  <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                </svg>
                Table Layout
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <Link
                to="/menu"
                className="bistro-button-outline"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 3v18" />
                  <path d="M8 3v7a2 2 0 0 1-4 0V3" />
                  <path d="M6 10v11" />
                  <path d="M14 3v18" />
                  <path d="M14 3c4 2 4 6 0 8" />
                  <path d="M18 3v18" />
                </svg>
                Browse Menu
              </Link>
              <Link
                to="/availability"
                className="bistro-button-gold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Find a Table
              </Link>
            </div>
          )
        }
      />

      {/* Customer Dining Highlights Banner */}
      {!isAdmin && (
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c5a059',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h4 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '0.98rem', color: '#282115', margin: 0, fontWeight: 600 }}>
                Cinnamon Bistro Artisanal Dining
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#78716c', margin: '0.15rem 0 0' }}>
                Handcrafted seasonal cuisine · Daily lunch & dinner seatings · Sommelier selected cellar
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: '#15803d',
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                borderRadius: '9999px',
                padding: '0.25rem 0.75rem',
              }}
            >
              <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
              Open for Bookings Today
            </span>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.number}
            className="bistro-card bistro-journey-card"
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '230px',
              padding: '1.5rem',
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid #eedfc9',
              background: '#ffffff',
              boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
            }}
          >
            {/* Top Gold Accent Line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
              }}
            />

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.1rem',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#faf5ec',
                    border: '1px solid #eedfc9',
                    color: '#8c6736',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </div>
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.25rem', fontWeight: 700, color: '#c5a059' }}>
                  {card.number}
                </span>
              </div>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.2rem', margin: '0 0 0.45rem 0', color: '#282115', fontWeight: 600 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
                {card.description}
              </p>
            </div>
            <Link
              to={card.link}
              className={card.buttonClass}
              style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
            >
              {card.buttonLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
