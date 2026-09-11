import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/customer/LoginPage';
import RegisterPage from '../pages/customer/RegisterPage';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import ProfilePage from '../pages/customer/ProfilePage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import KitchenQueuePage from '../pages/kitchen/KitchenQueuePage';
import ActiveTablesPage from '../pages/tables/ActiveTablesPage';
import AvailabilitySearchPage from '../pages/availability/AvailabilitySearchPage';
import ReservationCreationPlaceholderPage from '../pages/availability/ReservationCreationPlaceholderPage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import LandingPage from '../pages/common/LandingPage';
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
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />
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
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.KITCHEN_STAFF, ROLES.ADMIN]}>
            <ActiveTablesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/availability" element={<ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN]}><AvailabilitySearchPage /></ProtectedRoute>} />
      <Route path="/reservations/new" element={<ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN]}><ReservationCreationPlaceholderPage /></ProtectedRoute>} />

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

      {/* Catch-all fallback: redirect unmatched URLs to Public Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
