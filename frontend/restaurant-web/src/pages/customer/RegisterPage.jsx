import React from 'react';
import { useNavigate } from 'react-router-dom';
import Register from '../../components/auth/Register';

export default function RegisterPage({ onNavigateToLogin }) {
  const navigate = useNavigate();
  return (
    <Register onNavigateToLogin={onNavigateToLogin || (() => navigate('/login'))} />
  );
}
