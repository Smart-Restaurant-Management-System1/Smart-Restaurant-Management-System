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
import AdminOperationalDashboardPage from '../pages/admin/AdminOperationalDashboardPage';
import AdminReservationsPage from '../pages/admin/AdminReservationsPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import ReservationReportsPage from '../pages/admin/ReservationReportsPage';
import MenuManagementPage from '../pages/admin/MenuManagementPage';
import AdminUserManagementPage from '../pages/admin/AdminUserManagementPage';
import AdminFeedbackPage from '../pages/admin/AdminFeedbackPage';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';
import CustomerFeedbackPage from '../pages/customer/CustomerFeedbackPage';
import NotificationsPage from '../pages/customer/NotificationsPage';

import KitchenQueuePage from '../pages/kitchen/KitchenQueuePage';
import ActiveTablesPage from '../pages/tables/ActiveTablesPage';

import AvailabilitySearchPage from '../pages/availability/AvailabilitySearchPage';
import ReservationReviewPage from '../pages/availability/ReservationReviewPage';
import OrderReviewPage from '../pages/customer/OrderReviewPage';
import OrderTrackingPage from '../pages/customer/OrderTrackingPage';
import ReservationConfirmationPage from '../pages/availability/ReservationConfirmationPage';
import ReservationHistoryPage from '../pages/availability/ReservationHistoryPage';
import ReservationDetailPage from '../pages/availability/ReservationDetailPage';
import ReservationReschedulePage from '../pages/availability/ReservationReschedulePage';

import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import LandingPage from '../pages/common/LandingPage';

import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/common/AppLayout';
import { ROLES, ALL_ROLES, CUSTOMER_ORDERING_ROLES } from './roles';
import { useAuth } from '../context/AuthContext';

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';

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

        <Route
          path="/availability"
          element={<AvailabilitySearchPage />}
        />
      </Route>

      {/* Customer-only ordering routes (their APIs are Customer-only; Admin/Kitchen would get 403) */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={CUSTOMER_ORDERING_ROLES}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Customer Order Tracking - SR-135 / SR-280 */}
        <Route
          path="/orders"
          element={<OrderTrackingPage />}
        />
        <Route
          path="/orders/track"
          element={<OrderTrackingPage />}
        />

        {/* Customer Menu - SR-131 */}
        <Route
          path="/menu"
          element={<CustomerMenuPage />}
        />

        {/* Dine-in Order Review - SR-159 */}
        <Route
          path="/order-review"
          element={<OrderReviewPage />}
        />
      </Route>

      {/* Customer Reservation Pre-Order - SR-134 & UX Route Aliases */}
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
        <Route
          path="/pre-order"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/preorder"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/pre-orders"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/preorder-booking"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/pre-order-booking"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/reservations/pre-order"
          element={<ReservationPreOrderPage />}
        />
        <Route
          path="/reservation/pre-order"
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

        {/* Customer Feedback - SR-219 / SR-233 */}
        <Route
          path="/feedback"
          element={<CustomerFeedbackPage />}
        />

        {/* Customer Notification Center - SR-220 / SR-237 */}
        <Route
          path="/notifications"
          element={<NotificationsPage />}
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
              <Navigate to="/admin/tables" replace />
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
          path="/reservations"
          element={<Navigate to="/availability" replace />}
        />

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
        {/* Admin Operational Dashboard - SR-221 */}
        <Route
          path="/admin"
          element={<AdminOperationalDashboardPage />}
        />
        <Route
          path="/admin/dashboard"
          element={<AdminOperationalDashboardPage />}
        />

        {/* Menu Management - SR-130 */}
        <Route
          path="/admin/menu"
          element={<MenuManagementPage />}
        />

        {/* User Management - SR-218 */}
        <Route
          path="/admin/users"
          element={<AdminUserManagementPage />}
        />

        {/* Table Management - SR-01 */}
        <Route
          path="/admin/tables"
          element={<AdminDashboardPage />}
        />

        {/* Order Management & Search - SR-222 / SR-247 */}
        <Route
          path="/admin/orders"
          element={<AdminOrdersPage />}
        />

        <Route
          path="/admin/reservations"
          element={<AdminReservationsPage />}
        />

        <Route
          path="/admin/reports/reservations"
          element={<ReservationReportsPage />}
        />

        {/* Customer Feedback Review - SR-219 / SR-235 */}
        <Route
          path="/admin/feedback"
          element={<AdminFeedbackPage />}
        />

        {/* Payment Verifications - SR-280 / SR-286 */}
        <Route
          path="/admin/payments"
          element={<AdminPaymentsPage />}
        />

        {/* Admin Audit Trail - SR-223 / SR-253 */}
        <Route
          path="/admin/audit-logs"
          element={<AdminAuditLogsPage />}
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








