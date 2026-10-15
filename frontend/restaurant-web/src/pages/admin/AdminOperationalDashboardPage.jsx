import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import {
  getDashboardOverview,
  validateDashboardDateRange,
  getDatePreset
} from '../../services/adminDashboardService.js';

export default function AdminOperationalDashboardPage() {
  const [activePreset, setActivePreset] = useState('last7');
  const [dateRange, setDateRange] = useState(() => getDatePreset('last7'));
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch overview data
  const fetchData = useCallback(async (rangeToFetch = dateRange, isBackgroundRefresh = false) => {
    const err = validateDashboardDateRange(rangeToFetch.from, rangeToFetch.to);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);

    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getDashboardOverview({
        from: rangeToFetch.from,
        to: rangeToFetch.to
      });
      setOverview(data);
      setLastUpdated(new Date());
    } catch (apiErr) {
      if (apiErr?.response?.status === 403) {
        setError('You are not authorized to view the operational dashboard. Admin credentials required.');
      } else if (apiErr?.response?.status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(apiErr?.response?.data?.message || 'Unable to load operational dashboard metrics. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  // Initial load
  useEffect(() => {
    fetchData(dateRange, false);
  }, []);

  // Auto-refresh timer (every 60 seconds when enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(() => {
      fetchData(dateRange, true);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, dateRange, fetchData]);

  // Handle Preset selection
  const handlePresetChange = (preset) => {
    setActivePreset(preset);
    const newRange = getDatePreset(preset);
    setDateRange(newRange);
    setValidationError(null);
    fetchData(newRange, false);
  };

  // Handle manual date range submission
  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    setActivePreset('custom');
    fetchData(dateRange, false);
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchData(dateRange, true);
  };

  // Merged daily trend series for visualization and table view
  const mergedTrends = useMemo(() => {
    if (!overview) return [];
    const dateMap = new Map();

    (overview.reservationTrends || []).forEach((r) => {
      dateMap.set(r.date, {
        date: r.date,
        reservations: r.total ?? r.reservationsCount ?? 0,
        orders: 0
      });
    });

    (overview.orderTrends || []).forEach((o) => {
      const orderCount = o.total ?? o.ordersCount ?? 0;
      if (dateMap.has(o.date)) {
        dateMap.get(o.date).orders = orderCount;
      } else {
        dateMap.set(o.date, {
          date: o.date,
          reservations: 0,
          orders: orderCount
        });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [overview]);

  // Summary counts extracted safely
  const users = overview?.users || overview?.customerStaff || { totalCustomers: 0, totalStaff: 0 };
  const reservations = overview?.reservations || {
    activeReservations: 0,
    todaysReservations: 0,
    todayReservations: 0,
    totalReservations: 0
  };
  const activeReservationsCount = reservations.activeReservations || 0;
  const todayReservationsCount = reservations.todaysReservations ?? reservations.todayReservations ?? 0;
  const totalReservationsCount = reservations.totalReservations ?? reservations.totalReservationsInRange ?? 0;

  const orders = overview?.orders || {
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    servedOrders: 0,
    cancelledOrders: 0,
    totalDineInOrders: 0,
    totalPreOrders: 0
  };
  const dineInOrdersCount = orders.totalDineInOrders ?? orders.dineInOrders ?? 0;
  const reservationPreOrdersCount = orders.totalPreOrders ?? orders.reservationPreOrders ?? 0;

  const rawMenu = overview?.menu || {};
  const totalDishes = rawMenu.totalMenuItems ?? rawMenu.totalItems ?? 0;
  const availableDishes = rawMenu.availableMenuItems ?? rawMenu.availableItems ?? 0;
  const unavailableDishes = rawMenu.unavailableMenuItems ?? rawMenu.unavailableItems ?? 0;
  const availabilityRate = totalDishes > 0 ? (availableDishes / totalDishes) * 100 : 0;
  const categories = rawMenu.categories || rawMenu.categoryBreakdown || [];

  const hasActivity =
    totalReservationsCount > 0 ||
    (orders.totalOrders || 0) > 0 ||
    activeReservationsCount > 0;

  return (
    <div className="admin-operational-dashboard" style={{ paddingBottom: '3rem' }}>
      <PageHeader
        title="Operational Dashboard & Analytics"
        subtitle="Real-time restaurant operational overview, kitchen status, active bookings, and volume trends."
        eyebrow="Operations Management"
        actions={
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/admin/tables"
              className="bistro-button-outline"
              style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
            >
              Floor & Tables
            </Link>
            <Link
              to="/admin/reservations"
              className="bistro-button-outline"
              style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
            >
              Bookings
            </Link>
            <Link
              to="/kitchen"
              className="bistro-button-outline"
              style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
            >
              Kitchen Queue
            </Link>
            <Link
              to="/admin/reports/reservations"
              className="bistro-button-outline"
              style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
            >
              Export Reports
            </Link>
          </div>
        }
      />

      {/* Control & Filter Toolbar */}
      <section
        className="bistro-card"
        aria-label="Dashboard controls and date filter"
        style={{
          padding: '1.2rem 1.5rem',
          marginBottom: '1.8rem',
          borderRadius: '14px',
          border: '1px solid #e8e0d0',
          boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            zIndex: 1
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--bistro-ink)', marginRight: '0.2rem' }}>
              Period:
            </span>
            <button
              type="button"
              className={activePreset === 'today' ? 'bistro-button-gold' : 'bistro-button-outline'}
              onClick={() => handlePresetChange('today')}
              disabled={loading}
              style={{ padding: '0.38rem 0.8rem', fontSize: '0.82rem' }}
            >
              Today
            </button>
            <button
              type="button"
              className={activePreset === 'last7' ? 'bistro-button-gold' : 'bistro-button-outline'}
              onClick={() => handlePresetChange('last7')}
              disabled={loading}
              style={{ padding: '0.38rem 0.8rem', fontSize: '0.82rem' }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={activePreset === 'last30' ? 'bistro-button-gold' : 'bistro-button-outline'}
              onClick={() => handlePresetChange('last30')}
              disabled={loading}
              style={{ padding: '0.38rem 0.8rem', fontSize: '0.82rem' }}
            >
              Last 30 Days
            </button>
          </div>

          {/* Custom Date Range Form */}
          <form
            onSubmit={handleApplyCustomRange}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="dashboard-from" style={{ fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 500 }}>
                From:
              </label>
              <input
                id="dashboard-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => {
                  setDateRange({ ...dateRange, from: e.target.value });
                  setActivePreset('custom');
                }}
                disabled={loading}
                style={{
                  padding: '0.38rem 0.6rem',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid #d9d0bf',
                  backgroundColor: '#faf8f4'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="dashboard-to" style={{ fontSize: '0.82rem', color: 'var(--bistro-ink)', fontWeight: 500 }}>
                To:
              </label>
              <input
                id="dashboard-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => {
                  setDateRange({ ...dateRange, to: e.target.value });
                  setActivePreset('custom');
                }}
                disabled={loading}
                style={{
                  padding: '0.38rem 0.6rem',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid #d9d0bf',
                  backgroundColor: '#faf8f4'
                }}
              />
            </div>

            <button
              type="submit"
              className="bistro-button-gold"
              disabled={loading}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            >
              Apply
            </button>
          </form>

          {/* Refresh & Auto-poll Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="bistro-button-outline"
              onClick={handleManualRefresh}
              disabled={loading || refreshing}
              title="Refresh dashboard metrics"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none'
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>

            <button
              type="button"
              className={autoRefresh ? 'bistro-button-gold' : 'bistro-button-outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title="Toggle automatic 60-second background polling"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: autoRefresh ? '#15803d' : '#9ca3af'
                }}
              />
              Auto-poll (60s)
            </button>
          </div>
        </div>

        {/* Validation error notice */}
        {validationError && (
          <div
            role="alert"
            style={{
              marginTop: '0.8rem',
              padding: '0.6rem 0.9rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.84rem'
            }}
          >
            {validationError}
          </div>
        )}

        {/* Last updated indicator */}
        {lastUpdated && (
          <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--bistro-muted)' }}>
            Last synchronized: {lastUpdated.toLocaleTimeString()} (Window: {overview?.resolvedRange?.from} to {overview?.resolvedRange?.to})
          </div>
        )}
      </section>

      {/* Error State Banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1.8rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#fff8f8',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(185, 28, 28, 0.06)'
          }}
        >
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Failed to load dashboard data:</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem' }}>{error}</p>
          </div>
          <button
            type="button"
            className="bistro-button-gold"
            onClick={() => fetchData(dateRange, false)}
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State Spinner */}
      {loading && !overview && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px dashed #d9d0bf',
            marginBottom: '2rem'
          }}
        >
          <svg
            style={{
              animation: 'spin 1s linear infinite',
              width: '32px',
              height: '32px',
              margin: '0 auto 1rem',
              display: 'block',
              color: '#c5a059'
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <h3 style={{ fontFamily: 'Georgia, serif', color: 'var(--bistro-ink)', margin: '0 0 0.4rem' }}>
            Compiling Operational Analytics
          </h3>
          <p style={{ color: 'var(--bistro-muted)', fontSize: '0.86rem', margin: 0 }}>
            Gathering active bookings, kitchen tickets, user metrics, and inventory data…
          </p>
        </div>
      )}

      {/* Main Dashboard Content */}
      {overview && (
        <>
          {/* Top KPI Summary Metrics Cards */}
          <section
            aria-label="Core operational metrics"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '1.2rem',
              marginBottom: '2rem'
            }}
          >
            {/* Active Reservations */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid #e8e0d0',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Reservations
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--bistro-ink)', fontFamily: 'Georgia, serif', marginTop: '0.2rem' }}>
                    {activeReservationsCount}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    color: '#065f46',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: '1px solid #a7f3d0'
                  }}
                >
                  Live
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                Upcoming &amp; seated dining reservations
              </div>
            </div>

            {/* Today's Reservations */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid #e8e0d0',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Today's Bookings
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#b45309', fontFamily: 'Georgia, serif', marginTop: '0.2rem' }}>
                    {todayReservationsCount}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: '1px solid #fde68a'
                  }}
                >
                  Today
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                Scheduled for today's lunch &amp; dinner
              </div>
            </div>

            {/* Total Orders in Period */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid #e8e0d0',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Orders
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#1e40af', fontFamily: 'Georgia, serif', marginTop: '0.2rem' }}>
                    {orders.totalOrders || 0}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1e40af',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: '1px solid #bfdbfe'
                  }}
                >
                  Fulfillment
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                {dineInOrdersCount} Dine-In • {reservationPreOrdersCount} Pre-Orders
              </div>
            </div>

            {/* Total Customers */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid #e8e0d0',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Customers
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--bistro-ink)', fontFamily: 'Georgia, serif', marginTop: '0.2rem' }}>
                    {users.totalCustomers}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  Active Diners
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                Registered &amp; active customer accounts
              </div>
            </div>

            {/* Total Staff */}
            <div
              className="bistro-card"
              style={{
                padding: '1.25rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid #e8e0d0',
                boxShadow: '0 4px 14px rgba(40, 30, 15, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bistro-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Staff
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--bistro-ink)', fontFamily: 'Georgia, serif', marginTop: '0.2rem' }}>
                    {users.totalStaff}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  Personnel
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                Active kitchen staff &amp; administrators
              </div>
            </div>
          </section>

          {/* Kitchen Order Pipeline Section */}
          <section
            aria-label="Kitchen fulfillment pipeline"
            className="bistro-card"
            style={{
              padding: '1.6rem 1.8rem',
              borderRadius: '14px',
              border: '1px solid #e8e0d0',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
              marginBottom: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.35rem', color: 'var(--bistro-ink)', margin: 0 }}>
                  Kitchen Order Pipeline &amp; Activity
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--bistro-muted)' }}>
                  Live fulfillment status across Dine-in and Reservation Pre-Orders for the period
                </p>
              </div>
              <Link
                to="/kitchen"
                className="bistro-button-gold"
                style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}
              >
                Open Kitchen Display
              </Link>
            </div>

            {/* Funnel Pipeline Steps */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '1rem'
              }}
            >
              {/* Step 1: Pending */}
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '1.1rem',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                  1. Pending / Received
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#92400e', fontFamily: 'Georgia, serif', margin: '0.4rem 0 0.2rem' }}>
                  {orders.pendingOrders}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#b45309' }}>
                  Awaiting kitchen acceptance
                </div>
              </div>

              {/* Step 2: Preparing */}
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '1.1rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
                  2. Preparing
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#1e40af', fontFamily: 'Georgia, serif', margin: '0.4rem 0 0.2rem' }}>
                  {orders.preparingOrders}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#3b82f6' }}>
                  Actively being cooked / assembled
                </div>
              </div>

              {/* Step 3: Ready */}
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  padding: '1.1rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065f46', textTransform: 'uppercase' }}>
                  3. Ready to Serve
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#065f46', fontFamily: 'Georgia, serif', margin: '0.4rem 0 0.2rem' }}>
                  {orders.readyOrders}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#059669' }}>
                  Plated and ready for guest delivery
                </div>
              </div>

              {/* Step 4: Served / Completed */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.1rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase' }}>
                  4. Served / Fulfilled
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#334155', fontFamily: 'Georgia, serif', margin: '0.4rem 0 0.2rem' }}>
                  {orders.servedOrders}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Delivered and dining finished
                </div>
              </div>

              {/* Cancelled Pill/Card */}
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '1.1rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
                  Cancelled
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#991b1b', fontFamily: 'Georgia, serif', margin: '0.4rem 0 0.2rem' }}>
                  {orders.cancelledOrders}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#b91c1c' }}>
                  Cancelled by guest or manager
                </div>
              </div>
            </div>
          </section>

          {/* Menu Availability & Category Health Section */}
          <section
            aria-label="Menu item availability"
            className="bistro-card"
            style={{
              padding: '1.6rem 1.8rem',
              borderRadius: '14px',
              border: '1px solid #e8e0d0',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)',
              marginBottom: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.35rem', color: 'var(--bistro-ink)', margin: 0 }}>
                  Menu Inventory &amp; Availability
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--bistro-muted)' }}>
                  Current culinary catalog availability across categories
                </p>
              </div>
              <Link
                to="/admin/menu"
                className="bistro-button-outline"
                style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}
              >
                Manage Menu Items
              </Link>
            </div>

            {/* Menu High-level metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.9rem 1.1rem', backgroundColor: '#faf8f4', border: '1px solid #ede5d8', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--bistro-muted)', fontWeight: 600 }}>Total Dishes</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--bistro-ink)', fontFamily: 'Georgia, serif' }}>
                  {totalDishes}
                </div>
              </div>
              <div style={{ padding: '0.9rem 1.1rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>Available to Order</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#065f46', fontFamily: 'Georgia, serif' }}>
                  {availableDishes}
                </div>
              </div>
              <div style={{ padding: '0.9rem 1.1rem', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#be123c', fontWeight: 600 }}>Unavailable / 86'd</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#be123c', fontFamily: 'Georgia, serif' }}>
                  {unavailableDishes}
                </div>
              </div>
              <div style={{ padding: '0.9rem 1.1rem', backgroundColor: '#faf6ee', border: '1px solid #ebdcc5', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>Availability Ratio</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#92400e', fontFamily: 'Georgia, serif' }}>
                  {Number(availabilityRate || 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            {categories && categories.length > 0 && (
              <div className="bistro-table-responsive" style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ebdcc5', textAlign: 'left', color: 'var(--bistro-ink)' }}>
                      <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'center' }}>Total Items</th>
                      <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'center' }}>Available</th>
                      <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'center' }}>Unavailable</th>
                      <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'right' }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, idx) => {
                      const catTotal = cat.total ?? cat.totalCount ?? 0;
                      const catAvailable = cat.available ?? cat.availableCount ?? 0;
                      const catUnavailable = cat.unavailable ?? cat.unavailableCount ?? 0;
                      const rate = catTotal > 0 ? ((catAvailable / catTotal) * 100).toFixed(0) : 0;
                      return (
                        <tr
                          key={cat.category || idx}
                          style={{
                            borderBottom: '1px solid #f0eae1',
                            backgroundColor: idx % 2 === 0 ? '#faf8f5' : '#ffffff'
                          }}
                        >
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 500, color: 'var(--bistro-ink)' }}>
                            {cat.category || 'Uncategorized'}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>{catTotal}</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: '#065f46', fontWeight: 600 }}>
                            {catAvailable}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: catUnavailable > 0 ? '#b91c1c' : '#64748b' }}>
                            {catUnavailable}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '0.18rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: rate >= 90 ? '#ecfdf5' : rate >= 70 ? '#fffbeb' : '#fef2f2',
                                color: rate >= 90 ? '#065f46' : rate >= 70 ? '#92400e' : '#991b1b'
                              }}
                            >
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Operational Trends Section (Recharts + Accessible Table Alternative) */}
          <section
            aria-label="Daily volume trends"
            className="bistro-card"
            style={{
              padding: '1.6rem 1.8rem',
              borderRadius: '14px',
              border: '1px solid #e8e0d0',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.35rem', color: 'var(--bistro-ink)', margin: 0 }}>
                  Daily Volume &amp; Fulfillment Trends
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--bistro-muted)' }}>
                  Reservation volume and completed order throughput across the selected date range
                </p>
              </div>

              {/* Accessibility / View mode switch: Chart vs Table */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={viewMode === 'chart' ? 'bistro-button-gold' : 'bistro-button-outline'}
                  onClick={() => setViewMode('chart')}
                  style={{ padding: '0.36rem 0.75rem', fontSize: '0.8rem' }}
                  aria-pressed={viewMode === 'chart'}
                >
                  Chart View
                </button>
                <button
                  type="button"
                  className={viewMode === 'table' ? 'bistro-button-gold' : 'bistro-button-outline'}
                  onClick={() => setViewMode('table')}
                  style={{ padding: '0.36rem 0.75rem', fontSize: '0.8rem' }}
                  aria-pressed={viewMode === 'table'}
                >
                  Accessible Table View
                </button>
              </div>
            </div>

            {/* Empty check */}
            {!hasActivity && (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#faf8f5',
                  borderRadius: '10px',
                  border: '1px dashed #d9d0bf',
                  color: 'var(--bistro-muted)',
                  fontSize: '0.88rem'
                }}
              >
                No reservations or orders were recorded in the selected period ({overview?.resolvedRange?.from} to {overview?.resolvedRange?.to}).
                <div style={{ marginTop: '0.6rem' }}>
                  <button
                    type="button"
                    className="bistro-button-outline"
                    onClick={() => handlePresetChange('last30')}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                  >
                    Expand to Last 30 Days
                  </button>
                </div>
              </div>
            )}

            {hasActivity && viewMode === 'chart' && (
              <div style={{ width: '100%', height: 320, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mergedTrends} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eae1" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      stroke="#d9d0bf"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      stroke="#d9d0bf"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #ebdcc5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(40, 30, 15, 0.08)',
                        fontSize: '0.82rem'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '0.82rem', paddingTop: '10px' }}
                    />
                    <Bar
                      dataKey="reservations"
                      name="Reservations"
                      fill="#c5a059"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="orders"
                      name="Orders Fulfilled"
                      fill="#1e40af"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {hasActivity && viewMode === 'table' && (
              <div className="bistro-table-responsive" style={{ border: 'none', borderRadius: 0, marginBottom: 0, marginTop: '1rem' }}>
                <table
                  style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse', fontSize: '0.84rem' }}
                  aria-label="Daily volume trends data table"
                >
                  <caption style={{ textAlign: 'left', paddingBottom: '0.5rem', color: 'var(--bistro-muted)', fontSize: '0.8rem' }}>
                    Daily reservation and order activity table for period {overview?.resolvedRange?.from} to {overview?.resolvedRange?.to}.
                  </caption>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ebdcc5', textAlign: 'left', color: 'var(--bistro-ink)' }}>
                      <th scope="col" style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Date</th>
                      <th scope="col" style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'center' }}>Reservations</th>
                      <th scope="col" style={{ padding: '0.6rem 0.8rem', fontWeight: 600, textAlign: 'center' }}>Orders Fulfilled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedTrends.map((t, idx) => (
                      <tr
                        key={t.date}
                        style={{
                          borderBottom: '1px solid #f0eae1',
                          backgroundColor: idx % 2 === 0 ? '#faf8f5' : '#ffffff'
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.8rem', fontWeight: 500 }}>{t.date}</td>
                        <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', color: '#b45309', fontWeight: 600 }}>
                          {t.reservations}
                        </td>
                        <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', color: '#1e40af', fontWeight: 600 }}>
                          {t.orders}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ebdcc5', fontWeight: 700, backgroundColor: '#f5f0e6' }}>
                      <td style={{ padding: '0.65rem 0.8rem' }}>Totals in Period</td>
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center', color: '#b45309' }}>
                        {totalReservationsCount}
                      </td>
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center', color: '#1e40af' }}>
                        {orders.totalOrders}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

