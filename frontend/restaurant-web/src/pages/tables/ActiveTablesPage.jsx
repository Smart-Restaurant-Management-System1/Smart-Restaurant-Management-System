import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveTables } from '../../services/tableService';
import { getActiveTablesView, tableCardLabel } from './activeTablesView';
import PageHeader from '../../components/common/PageHeader';

export default function ActiveTablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const view = getActiveTablesView({ loading, error, tables });

  return (
    <div className="active-tables-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Dining Floor Guide"
        title={<>Dining Room <em>Tables</em></>}
        subtitle="Browse configured dining table capacities and arrangements across Cinnamon Bistro. For live bookings, use table availability."
        actions={
          <Link to="/availability" className="bistro-button-gold">
            Check Availability <span aria-hidden="true">→</span>
          </Link>
        }
      />

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
          {tables.map((table) => (
            <article className="active-table-card bistro-card" key={table.tableId} aria-label={tableCardLabel(table)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="active-table-number" style={{ color: 'var(--bistro-ink)', fontSize: '1.35rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                  Table {table.tableNumber}
                </p>
                <span className="reservation-status-confirmed">
                  {table.operationalStatus || 'Available'}
                </span>
              </div>
              <p className="active-table-capacity" style={{ color: 'var(--bistro-muted)', margin: '0.6rem 0 0.5rem 0', fontSize: '0.9rem' }}>
                {table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
