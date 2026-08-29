import React from 'react';
import Login from '../../components/auth/Login';

export default function LoginPage({ onNavigateToRegister }) {
  return <Login onNavigateToRegister={onNavigateToRegister} />;
}
