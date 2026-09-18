import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveTables } from '../../services/tableService';
import { getActiveTablesView, tableCardLabel } from './activeTablesView';
import PageHeader from '../../components/common/PageHeader';
import BookTableModal from '../../components/reservations/BookTableModal';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/roles';

export default function ActiveTablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  const { user } = useAuth();
  const navigate = useNavigate();

  const isCustomer = user?.roles?.includes(ROLES.CUSTOMER) || !user?.roles?.includes(ROLES.KITCHEN_STAFF);

  const loadTables = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getActiveTables();
      setTables(Array.isArray(response) ? response : []);
    } catch {
      setTables([]);
      setError('We could not load the restaurant tables. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const locations = useMemo(() => {
    const locSet = new Set();
    tables.forEach((t) => {
      if (t.location) locSet.add(t.location);
    });
    return ['ALL', ...Array.from(locSet).sort()];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (selectedLocation === 'ALL') return tables;
    return tables.filter((t) => t.location === selectedLocation);
  }, [tables, selectedLocation]);

  const view = getActiveTablesView({ loading, error, tables });

  const handleBookingSuccess = (reservation) => {
    setSelectedTable(null);
    navigate('/reservations/confirmation', { state: { reservation } });
  };

  return (
    <div className="active-tables-page-content" style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Dining Room Tables"
        title={<>Reserve Your <em>Table</em></>}
        subtitle="Browse tables configured by Cinnamon Bistro. Choose your preferred table, select your guests and time, and book directly."
        actions={
          <Link to="/availability" className="bistro-button-gold">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search by Availability
          </Link>
        }
      />

      {/* Location Filter Bar */}
      {view === 'ready' && locations.length > 2 && (
        <div
          className="active-tables-filter-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            overflowX: 'auto',
            paddingBottom: '0.65rem',
            marginBottom: '1.5rem',
            scrollbarWidth: 'none',
          }}
        >
          {locations.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                className={`bistro-category-pill ${isSelected ? 'active' : ''}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{loc === 'ALL' ? 'All Dining Areas' : loc}</span>
              </button>
            );
          })}
        </div>
      )}

      {view === 'loading' && (
        <div
          className="active-tables-state"
          role="status"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            color: '#78716c',
            textAlign: 'center',
            padding: '3rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid rgba(197, 160, 89, 0.25)',
              borderTopColor: '#c5a059',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ margin: 0, fontSize: '0.92rem', fontStyle: 'italic' }}>
            Loading restaurant tables catalog…
          </p>
        </div>
      )}

      {view === 'error' && (
        <div className="active-tables-state active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
          <button type="button" className="bistro-button-gold" onClick={loadTables}>
            Try Again
          </button>
        </div>
      )}

      {view === 'empty' && (
        <div className="bistro-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', border: '1px solid #eedfc9', borderRadius: '12px', background: '#ffffff' }}>
          <p style={{ color: '#78716c', margin: 0 }}>No active tables are currently listed. Please check back soon.</p>
        </div>
      )}

      {view === 'ready' && (
        <section
          className="active-tables-grid"
          aria-label="Active restaurant tables"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredTables.map((table) => (
            <article
              className="active-table-card bistro-card bistro-journey-card"
              key={table.tableId}
              aria-label={tableCardLabel(table)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                border: '1px solid #eedfc9',
                borderRadius: '12px',
                background: '#ffffff',
                boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
                overflow: 'hidden',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              }}
            >
              {/* Top Gold Gradient Accent Line */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#faf5ec',
                        border: '1px solid #eedfc9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8c6736',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 18v3" />
                        <path d="M20 18v3" />
                        <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                        <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                      </svg>
                    </div>
                    <div>
                      <p
                        className="active-table-number"
                        style={{
                          color: '#282115',
                          fontSize: '1.25rem',
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        Table {table.tableNumber}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#ecfdf5',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                    }}
                  >
                    <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
                    {table.operationalStatus || 'Available'}
                  </span>
                </div>

                {/* Location & Seating Capacity Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#faf6f0',
                      color: '#6b532f',
                      border: '1px solid #eedfc9',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <span className="active-table-capacity">
                      {table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'}
                    </span>
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{table.location || 'Main Dining'}</span>
                  </span>
                </div>
              </div>

              {/* Book Table Action Button */}
              {isCustomer && (
                <button
                  type="button"
                  className="bistro-button-gold"
                  style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
                  onClick={() => setSelectedTable(table)}
                >
                  Book This Table <span aria-hidden="true">→</span>
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Booking Modal */}
      {selectedTable && (
        <BookTableModal
          isOpen={Boolean(selectedTable)}
          onClose={() => setSelectedTable(null)}
          table={selectedTable}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
