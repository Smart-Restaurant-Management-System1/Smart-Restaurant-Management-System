import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveTables } from '../../services/tableService';
import { getActiveTablesView, tableCardLabel } from './activeTablesView';

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
    <main className="active-tables-page">
      <div className="active-tables-content">
        <Link to="/" className="link-jelly-back">← Back to home</Link>
        <header className="active-tables-header">
          <p className="active-tables-eyebrow">Restaurant guide</p>
          <h1>Our tables</h1>
          <p>Browse the active table sizes before making a reservation. This list does not show date-and-time availability.</p>
        </header>

        {view === 'loading' && <div className="active-tables-state" role="status">Loading active tables…</div>}
        {view === 'error' && (
          <div className="active-tables-state active-tables-error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn-jelly-primary" onClick={loadTables}>Try again</button>
          </div>
        )}
        {view === 'empty' && <div className="active-tables-state">No active tables are currently listed. Please check back soon.</div>}
        {view === 'ready' && (
          <section className="active-tables-grid" aria-label="Active restaurant tables">
            {tables.map((table) => (
              <article className="active-table-card" key={table.tableId} aria-label={tableCardLabel(table)}>
                <p className="active-table-number">Table {table.tableNumber}</p>
                <p className="active-table-capacity">{table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'}</p>
                <span className="active-table-status">{table.operationalStatus || 'Available'}</span>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
