import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CustomerPortalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="portal-container" style={{ padding: '2.5rem', color: '#111827', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Welcome, {user?.fullName || 'Guest'}
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Customer Dining Portal — View reservations, digital menus, and orders.
        </p>
        <div style={{ background: '#fdfaf0', border: '1px solid #d4af37', padding: '1.25rem', borderRadius: '10px' }}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.roles?.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}
