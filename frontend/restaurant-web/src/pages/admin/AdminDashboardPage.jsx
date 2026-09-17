import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AddTableModal from '../../components/reservations/AddTableModal';
import EditTableModal from '../../components/reservations/EditTableModal';
import PageHeader from '../../components/common/PageHeader';
import { getTables, updateTable, deleteTable } from '../../services/tableService';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Edit and Deactivate states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [tableToDeactivate, setTableToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleOpenEditModal = (table) => {
    setSelectedTableForEdit(table);
    setIsEditModalOpen(true);
  };

  const handleTableUpdated = (updatedTable) => {
    setTables((prev) =>
      prev.map((t) => (t.id === updatedTable.id ? updatedTable : t))
    );
    setSuccessBanner(`Table ${updatedTable.tableNumber} was updated successfully!`);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  const handleMakeAvailable = async (tbl) => {
    try {
      const updated = await updateTable(tbl.id, {
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        location: tbl.location,
        status: 'Available',
      });
      setTables((prev) =>
        prev.map((t) => (t.id === tbl.id ? (updated || { ...t, status: 'Available', isActive: true }) : t))
      );
      setSuccessBanner(`Table ${tbl.tableNumber} is now Available.`);
      setTimeout(() => {
        setSuccessBanner(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to make table available:', err);
      alert(err.response?.data?.message || 'Failed to update table status. Please try again.');
    }
  };

  const handleOpenDeactivateModal = (table) => {
    if (table.status === 'Occupied') {
      alert(`Table '${table.tableNumber}' is currently occupied and cannot be deactivated until it becomes available again.`);
      return;
    }
    if (table.status === 'Inactive' || table.isActive === false) {
      alert(`Table '${table.tableNumber}' is already inactive.`);
      return;
    }
    setTableToDeactivate(table);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!tableToDeactivate || isDeactivating) return;
    if (tableToDeactivate.status === 'Occupied') {
      alert(`Table '${tableToDeactivate.tableNumber}' is currently occupied and cannot be deactivated until it becomes available again.`);
      setIsDeactivateModalOpen(false);
      setTableToDeactivate(null);
      return;
    }
    setIsDeactivating(true);
    try {
      await deleteTable(tableToDeactivate.id);
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableToDeactivate.id
            ? { ...t, status: 'Inactive', isActive: false }
            : t
        )
      );
      setSuccessBanner(`Table ${tableToDeactivate.tableNumber} was deactivated successfully and marked Inactive.`);
      setTimeout(() => {
        setSuccessBanner(null);
      }, 4000);
      setIsDeactivateModalOpen(false);
      setTableToDeactivate(null);
    } catch (err) {
      console.error('Failed to deactivate table:', err);
      alert(err.response?.data?.message || 'Failed to deactivate table. Please try again.');
    } finally {
      setIsDeactivating(false);
    }
  };

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
    (t) => t.status === 'Available' || (t.status !== 'Occupied' && t.status !== 'Inactive' && t.isActive === true)
  ).length;
  const occupiedCount = tables.filter((t) => t.status === 'Occupied').length;

  return (
    <div className="admin-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Admin Portal"
        title={<>Restaurant Management & <em>Seating.</em></>}
        subtitle="Configure restaurant dining tables, monitor room seating capacity, and oversee daily operations."
        actions={
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bistro-button-gold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Table
          </button>
        }
      />

      {/* Admin Info Banner */}
      <div className="bistro-info-banner">
        <div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--bistro-ink)' }}>
            <strong>Admin Session:</strong> {user?.fullName || 'Administrator'} ({user?.email || 'admin@bistro.com'})
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--bistro-bronze)' }}>
            <strong>Privileges:</strong> Full System Administration (Table Configuration, Staff, Reporting)
          </p>
        </div>
        <span className="bistro-info-tag">
          Admin Session
        </span>
      </div>

      {/* Success Alert Banner */}
      {successBanner && (
        <div
          style={{
            backgroundColor: '#edf7ee',
            border: '1px solid #c2e2c6',
            color: '#1e5e29',
            padding: '0.9rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.92rem',
            fontWeight: '500',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 2px 8px rgba(40, 37, 31, 0.04)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successBanner}</span>
        </div>
      )}

      {/* Section Header & Add Table Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', margin: 0 }}>
            Restaurant Tables & <em>Seating</em>
          </h2>
          <p style={{ color: 'var(--bistro-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Digital configuration of dining tables and seat capacities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="bistro-button-gold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Table
        </button>
      </div>

      {/* Capacity / Overview Cards - Matching Landing Page Metric Numbers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="bistro-metric-card">
          <span className="bistro-metric-label">
            Configured Tables
          </span>
          <div className="bistro-metric-value">
            {tables.length}
          </div>
        </div>

        <div className="bistro-metric-card">
          <span className="bistro-metric-label">
            Total Seating Capacity
          </span>
          <div className="bistro-metric-value" style={{ color: 'var(--bistro-bronze)' }}>
            {totalCapacity} <span style={{ fontSize: '0.95rem', color: 'var(--bistro-muted)', fontFamily: 'Poppins, sans-serif' }}>guests</span>
          </div>
        </div>

        <div className="bistro-metric-card">
          <span className="bistro-metric-label">
            Available for Booking
          </span>
          <div className="bistro-metric-value" style={{ color: '#276732' }}>
            {availableCount}
          </div>
        </div>

        <div className="bistro-metric-card">
          <span className="bistro-metric-label">
            Currently Occupied
          </span>
          <div className="bistro-metric-value" style={{ color: '#8c6736' }}>
            {occupiedCount}
          </div>
        </div>
      </div>

      {/* Table List / Data Card */}
      <div className="bistro-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <tr style={{ background: '#eee8dc', borderBottom: '1px solid #dfd8cb' }}>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                      Table
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                      Capacity
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                      Location / Section
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#443a2d', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((tbl, idx) => {
                    const isOccupied = tbl.status === 'Occupied';
                    const isAvailable = tbl.status === 'Available' || (!tbl.status && tbl.isActive === true);
                    return (
                      <tr
                        key={tbl.id || tbl.tableNumber || idx}
                        style={{
                          borderBottom: idx === tables.length - 1 ? 'none' : '1px solid #eee5d7',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf6ec')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--bistro-ink)', fontSize: '0.92rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              background: '#eee3cf',
                              borderRadius: '6px',
                              fontFamily: 'Georgia, serif',
                              fontSize: '0.92rem',
                              fontWeight: '700',
                              color: '#6b532f',
                              border: '1px solid #dcd1be',
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
                          {isOccupied ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fcd34d',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f59e0b',
                                }}
                              />
                              Occupied
                            </span>
                          ) : isAvailable ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                backgroundColor: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#10b981',
                                }}
                              />
                              Available
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#9ca3af',
                                }}
                              />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            {isOccupied && (
                              <button
                                type="button"
                                onClick={() => handleMakeAvailable(tbl)}
                                className="btn-jelly-secondary"
                                title={`Release table ${tbl.tableNumber} and set status to Available`}
                                style={{
                                  padding: '0.42rem 0.75rem',
                                  fontSize: '0.82rem',
                                  color: '#065f46',
                                  borderColor: '#6ee7b7',
                                  backgroundColor: '#ecfdf5',
                                  fontWeight: '600',
                                  gap: '0.35rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Make Available
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(tbl)}
                              className="btn-jelly-secondary"
                              title={isOccupied ? `Table ${tbl.tableNumber} is occupied. View or release to edit.` : `Edit table ${tbl.tableNumber}`}
                              style={{
                                padding: '0.42rem 0.75rem',
                                fontSize: '0.82rem',
                                gap: '0.35rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                              Edit
                            </button>
                            {(() => {
                              const isAlreadyInactive = tbl.status === 'Inactive' || tbl.isActive === false;
                              const isDeactivateDisabled = isOccupied || isAlreadyInactive;
                              return (
                                <button
                                  type="button"
                                  onClick={() => !isDeactivateDisabled && handleOpenDeactivateModal(tbl)}
                                  disabled={isDeactivateDisabled}
                                  className="btn-jelly-secondary"
                                  title={
                                    isOccupied
                                      ? `Table ${tbl.tableNumber} is occupied and cannot be deactivated until made available`
                                      : isAlreadyInactive
                                      ? `Table ${tbl.tableNumber} is already inactive`
                                      : `Deactivate table ${tbl.tableNumber}`
                                  }
                                  style={{
                                    padding: '0.42rem 0.75rem',
                                    fontSize: '0.82rem',
                                    color: isDeactivateDisabled ? '#9ca3af' : '#b45309',
                                    borderColor: isDeactivateDisabled ? '#e5e7eb' : '#fcd34d',
                                    backgroundColor: isDeactivateDisabled ? '#f9fafb' : '#fffbeb',
                                    cursor: isDeactivateDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDeactivateDisabled ? 0.6 : 1,
                                    gap: '0.35rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDeactivateDisabled ? '#9ca3af' : '#b45309'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </svg>
                                  Deactivate
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTableCreated={handleTableCreated}
      />

      {/* Edit Table Modal */}
      <EditTableModal
        isOpen={isEditModalOpen}
        table={selectedTableForEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTableForEdit(null);
        }}
        onTableUpdated={handleTableUpdated}
      />

      {/* Deactivate Confirmation Modal */}
      {isDeactivateModalOpen && tableToDeactivate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivateModalTitle"
          onClick={() => !isDeactivating && setIsDeactivateModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              border: '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h2
              id="deactivateModalTitle"
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.5rem',
              }}
            >
              Deactivate Table {tableToDeactivate.tableNumber}
            </h2>
            <p
              style={{
                fontSize: '0.92rem',
                color: '#6b7280',
                marginBottom: '1.75rem',
                lineHeight: '1.5',
              }}
            >
              Are you sure you want to deactivate table <strong>{tableToDeactivate.tableNumber}</strong> ({tableToDeactivate.capacity} seats, {tableToDeactivate.location})? This will mark the table as <strong>Inactive</strong> and prevent new reservations while preserving all historical dining records.
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
                onClick={() => setIsDeactivateModalOpen(false)}
                disabled={isDeactivating}
                className="btn-jelly-secondary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  flex: 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                className="btn-jelly-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  background: '#d97706',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {isDeactivating ? (
                  <>
                    <svg
                      style={{ animation: 'spin 1s linear infinite', width: '15px', height: '15px' }}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Deactivating...</span>
                  </>
                ) : (
                  'Deactivate Table'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
