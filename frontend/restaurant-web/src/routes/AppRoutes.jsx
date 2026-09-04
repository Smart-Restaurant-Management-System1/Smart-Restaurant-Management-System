import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import LoginPage from '../pages/customer/LoginPage';
import RegisterPage from '../pages/customer/RegisterPage';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import KitchenQueuePage from '../pages/kitchen/KitchenQueuePage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from './roles';
import { useAuth } from '../context/AuthContext';

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';
    if (user?.roles?.includes(ROLES.ADMIN)) return '/admin';
    if (user?.roles?.includes(ROLES.KITCHEN_STAFF)) return '/kitchen';
    return '/portal';
  };

  return (
    <>
      <Navbar />
      <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to={getDefaultRedirect()} replace />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to={getDefaultRedirect()} replace />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Customer Protected Routes */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN]}>
            <CustomerPortalPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Kitchen Staff Protected Routes */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={[ROLES.KITCHEN_STAFF, ROLES.ADMIN]}>
            <KitchenQueuePage />
          </ProtectedRoute>
        }
      />

      {/* Default Fallback */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
    </>
  );
}
