import ReservationPreOrderPage from "../pages/customer/ReservationPreOrderPage";

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../pages/customer/LoginPage';
import RegisterPage from '../pages/customer/RegisterPage';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import CustomerMenuPage from '../pages/customer/CustomerMenuPage';
import CustomerCartPage from '../pages/customer/CustomerCartPage';
import ProfilePage from '../pages/customer/ProfilePage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminReservationsPage from '../pages/admin/AdminReservationsPage';
import ReservationReportsPage from '../pages/admin/ReservationReportsPage';
import MenuManagementPage from '../pages/admin/MenuManagementPage';

import KitchenQueuePage from '../pages/kitchen/KitchenQueuePage';
import ActiveTablesPage from '../pages/tables/ActiveTablesPage';

import AvailabilitySearchPage from '../pages/availability/AvailabilitySearchPage';
import ReservationReviewPage from '../pages/availability/ReservationReviewPage';
import OrderReviewPage from '../pages/customer/OrderReviewPage';
import ReservationConfirmationPage from '../pages/availability/ReservationConfirmationPage';
import ReservationHistoryPage from '../pages/availability/ReservationHistoryPage';
import ReservationDetailPage from '../pages/availability/ReservationDetailPage';
import ReservationReschedulePage from '../pages/availability/ReservationReschedulePage';

import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import LandingPage from '../pages/common/LandingPage';

import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/common/AppLayout';
import { ROLES, ALL_ROLES } from './roles';
import { useAuth } from '../context/AuthContext';

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';

    if (user?.roles?.includes(ROLES.ADMIN)) {
      return '/admin';
    }

    if (user?.roles?.includes(ROLES.KITCHEN_STAFF)) {
      return '/kitchen';
    }

    return '/portal';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          !isAuthenticated ? (
            <LoginPage />
          ) : (
            <Navigate to={getDefaultRedirect()} replace />
          )
        }
      />

      <Route
        path="/register"
        element={
          !isAuthenticated ? (
            <RegisterPage />
          ) : (
            <Navigate to={getDefaultRedirect()} replace />
          )
        }
      />

      <Route
        path="/unauthorized"
        element={<UnauthorizedPage />}
      />

      {/* Shared Authenticated Profile Route */}
      <Route
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/profile"
          element={<ProfilePage />}
        />
      </Route>

      {/* Customer and Admin Shared Protected Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/portal"
          element={<CustomerPortalPage />}
        />

        {/* Customer Menu - SR-131 */}
        <Route
          path="/menu"
          element={<CustomerMenuPage />}
        />

        <Route
          path="/order-review"
          element={
          <OrderReviewPage />
        }
        />

        <Route
          path="/availability"
          element={<AvailabilitySearchPage />}
        />
      </Route>

      {/* Customer Reservation Pre-Order - SR-134 */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.CUSTOMER]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/reservation-pre-order"
          element={<ReservationPreOrderPage />}
        />
      </Route>

      {/* Customer Order Cart - SR-132 */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.CUSTOMER]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/cart"
          element={<CustomerCartPage />}
        />
      </Route>

      {/* Tables Route */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.CUSTOMER,
              ROLES.KITCHEN_STAFF,
              ROLES.ADMIN,
            ]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/tables"
          element={
            user?.roles?.includes(ROLES.ADMIN) ? (
              <Navigate to="/admin" replace />
            ) : (
              <ActiveTablesPage />
            )
          }
        />
      </Route>

      {/* Customer-only Reservation Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.CUSTOMER]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/reservations/new"
          element={<ReservationReviewPage />}
        />

        <Route
          path="/reservations/confirmation"
          element={<ReservationConfirmationPage />}
        />

        <Route
          path="/reservations/history"
          element={<ReservationHistoryPage />}
        />

        <Route
          path="/reservations/:reservationId"
          element={<ReservationDetailPage />}
        />

        <Route
          path="/reservations/reschedule"
          element={<ReservationReschedulePage />}
        />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={<AdminDashboardPage />}
        />

        {/* Menu Management - SR-130 */}
        <Route
          path="/admin/menu"
          element={<MenuManagementPage />}
        />

        {/* Existing Admin Routes */}
        <Route
          path="/admin/tables"
          element={<Navigate to="/admin" replace />}
        />

        <Route
          path="/admin/reservations"
          element={<AdminReservationsPage />}
        />

        <Route
          path="/admin/reports/reservations"
          element={<ReservationReportsPage />}
        />
      </Route>

      {/* Kitchen Staff Protected Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.KITCHEN_STAFF,
              ROLES.ADMIN,
            ]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/kitchen"
          element={<KitchenQueuePage />}
        />
      </Route>

      {/* Catch-all Fallback */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}


