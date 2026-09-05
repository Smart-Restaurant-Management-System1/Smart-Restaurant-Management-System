import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../../components/auth/Login';

export default function LoginPage({ onNavigateToRegister }) {
  const navigate = useNavigate();
  return (
    <Login onNavigateToRegister={onNavigateToRegister || (() => navigate('/register'))} />
  );
}
