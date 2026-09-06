import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AddTableModal from '../../components/reservations/AddTableModal';
import { getTables } from '../../services/tableService';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTables();
      setTables(data || []);
    } catch (err) {
      console.error('Failed to fetch restaurant tables:', err);
      setError('Unable to load restaurant tables. Please ensure the reservation service is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleTableCreated = (newTable) => {
    // Add new table to local state or refresh from backend
    setTables((prev) => {
      const exists = prev.some((t) => t.id === newTable.id || t.tableNumber === newTable.tableNumber);
      if (exists) return prev;
      return [...prev, newTable];
    });

    setSuccessBanner(`Table ${newTable.tableNumber} was added successfully!`);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  // Metrics calculations
  const totalCapacity = tables.reduce((acc, t) => acc + (parseInt(t.capacity, 10) || 0), 0);
  const availableCount = tables.filter(
    (t) => t.status === 'Available' || t.isActive === true
  ).length;

  return (
    <div
      className="admin-container"
      style={{
        padding: '2.5rem 1.5rem',
        color: '#111827',
        background: '#ffffff',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#d4af37',
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            Administration Portal
          </span>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              marginBottom: '0.4rem',
              color: '#111827',
            }}
          >
            Management Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.98rem' }}>
            Configure restaurant tables, monitor seating capacity, and manage dining service.
          </p>
        </div>

        {/* Admin Info Banner */}
        <div
          style={{
            background: '#fdfaf0',
            border: '1px solid #d4af37',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937' }}>
              <strong>Admin:</strong> {user?.fullName || 'Administrator'} ({user?.email || 'admin@bistro.com'})
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#856404' }}>
              <strong>Privileges:</strong> Full System Administration (Table Configuration, Staff, Reporting)
            </p>
          </div>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#d4af37',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            Admin Session
          </span>
        </div>

        {/* Success Alert Banner */}
        {successBanner && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #6ee7b7',
              color: '#065f46',
              padding: '0.9rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: '500',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successBanner}</span>
          </div>
        )}

        {/* Section Header & Add Table Action */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
              }}
            >
              Restaurant Tables & Seating
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: '#6b7280' }}>
              Digital configuration of dining tables and seat capacities.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-jelly-primary"
            style={{
              padding: '0.75rem 1.4rem',
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Table</span>
          </button>
        </div>

        {/* Metrics Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: '500' }}>
              Configured Tables
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#111827', marginTop: '0.25rem' }}>
              {tables.length}
            </div>
          </div>

          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: '500' }}>
              Total Seating Capacity
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#d4af37', marginTop: '0.25rem' }}>
              {totalCapacity} <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>guests</span>
            </div>
          </div>

          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: '500' }}>
              Available for Booking
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#059669', marginTop: '0.25rem' }}>
              {availableCount}
            </div>
          </div>
        </div>

        {/* Table List / Data Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              <svg
                style={{
                  animation: 'spin 1s linear infinite',
                  width: '28px',
                  height: '28px',
                  margin: '0 auto 1rem',
                  display: 'block',
                  color: '#d4af37',
                }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading restaurant tables...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: '#ef4444', fontSize: '0.95rem', marginBottom: '1rem' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={fetchTables}
                className="btn-jelly-secondary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
              >
                Retry
              </button>
            </div>
          ) : tables.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d4af37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3" />
                  <path d="M20 18v3" />
                  <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '0.4rem' }}>
                No tables configured yet
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                Start configuring your dining room seating by clicking the "Add Table" button above.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn-jelly-primary"
                style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}
              >
                Add Your First Table
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                      Table
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                      Capacity
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                      Location / Section
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((tbl, idx) => {
                    const isAvailable = tbl.status === 'Available' || tbl.isActive === true;
                    return (
                      <tr
                        key={tbl.id || tbl.tableNumber || idx}
                        style={{
                          borderBottom: idx === tables.length - 1 ? 'none' : '1px solid #f3f4f6',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              fontSize: '0.88rem',
                              fontWeight: '700',
                              color: '#1f2937',
                            }}
                          >
                            {tbl.tableNumber}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.92rem', color: '#374151' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            <strong>{tbl.capacity}</strong> seats
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.92rem', color: '#4b5563' }}>
                          {tbl.location}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              backgroundColor: isAvailable ? '#ecfdf5' : '#f3f4f6',
                              color: isAvailable ? '#065f46' : '#6b7280',
                              border: isAvailable ? '1px solid #a7f3d0' : '1px solid #e5e7eb',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isAvailable ? '#10b981' : '#9ca3af',
                              }}
                            />
                            {isAvailable ? 'Available' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTableCreated={handleTableCreated}
      />
    </div>
  );
}
