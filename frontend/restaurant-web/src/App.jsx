import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';

function App() {
  const [currentPage, setCurrentPage] = useState('login');

  return (
    <AuthProvider>
      {currentPage === 'login' ? (
        <LoginPage onNavigateToRegister={() => setCurrentPage('register')} />
      ) : (
        <RegisterPage onNavigateToLogin={() => setCurrentPage('login')} />
      )}
    </AuthProvider>
  );
}

export default App;
