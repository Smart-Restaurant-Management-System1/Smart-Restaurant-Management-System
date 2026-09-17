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
    <div className="active-tables-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Dining Room Tables"
        title={<>Reserve Your <em>Table</em></>}
        subtitle="Browse tables configured by Cinnamon Bistro. Choose your preferred table, select your guests and time, and book directly."
        actions={
          <Link to="/availability" className="bistro-button-outline">
            Search by Availability <span aria-hidden="true">→</span>
          </Link>
        }
      />

      {/* Location Filter Bar */}
      {view === 'ready' && locations.length > 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            overflowX: 'auto',
            paddingBottom: '0.6rem',
            marginBottom: '1.5rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bistro-muted)', whiteSpace: 'nowrap' }}>
            Filter by Area:
          </span>
          {locations.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--bistro-bronze)' : '1px solid #d9d0bf',
                  backgroundColor: isSelected ? 'var(--bistro-bronze)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--bistro-ink)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {loc === 'ALL' ? 'All Areas' : loc}
              </button>
            );
          })}
        </div>
      )}

      {view === 'loading' && (
        <div className="active-tables-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem' }}>
          Loading active tables…
        </div>
      )}

      {view === 'error' && (
        <div className="active-tables-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{error}</p>
          <button type="button" className="bistro-button-gold" onClick={loadTables}>
            Try again
          </button>
        </div>
      )}

      {view === 'empty' && (
        <div className="bistro-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <p style={{ color: 'var(--bistro-muted)', margin: 0 }}>No active tables are currently listed. Please check back soon.</p>
        </div>
      )}

      {view === 'ready' && (
        <section className="active-tables-grid" aria-label="Active restaurant tables">
          {filteredTables.map((table) => (
            <article
              className="active-table-card bistro-card"
              key={table.tableId}
              aria-label={tableCardLabel(table)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p
                    className="active-table-number"
                    style={{
                      color: 'var(--bistro-ink)',
                      fontSize: '1.35rem',
                      fontFamily: 'Georgia, serif',
                      margin: 0,
                    }}
                  >
                    Table {table.tableNumber}
                  </p>
                  <span className="reservation-status-confirmed">
                    {table.operationalStatus || 'Available'}
                  </span>
                </div>

                {/* Location indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    margin: '0.65rem 0 0.35rem',
                    color: 'var(--bistro-bronze)',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{table.location || 'Main Dining'}</span>
                </div>

                {/* Seating Capacity */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    margin: '0.2rem 0 1.25rem',
                    color: 'var(--bistro-muted)',
                    fontSize: '0.88rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="active-table-capacity">
                    {table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'} · Max {table.seatingCapacity} guests
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
