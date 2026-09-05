import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="admin-container" style={{ padding: '2.5rem', color: '#111827', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Management Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Administrator controls for tables, staff, and restaurant performance.
        </p>
        <div style={{ background: '#fdfaf0', border: '1px solid #d4af37', padding: '1.25rem', borderRadius: '10px' }}>
          <p><strong>Admin:</strong> {user?.fullName} ({user?.email})</p>
          <p><strong>Privileges:</strong> Full System Administration</p>
        </div>
      </div>
    </div>
  );
}
