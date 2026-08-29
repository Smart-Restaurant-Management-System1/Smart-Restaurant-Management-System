import React from 'react';
import Register from '../../components/auth/Register';

export default function RegisterPage({ onNavigateToLogin }) {
  return <Register onNavigateToLogin={onNavigateToLogin} />;
}
