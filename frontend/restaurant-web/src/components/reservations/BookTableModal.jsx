import React, { useState, useEffect } from 'react';
import { createReservation } from '../../services/tableService';
import { isBookingConflict, bookingConflictMessage } from '../../pages/availability/bookingConflict';

const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() || `res-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookTableModal({ isOpen, onClose, table, onSuccess }) {
  const [formData, setFormData] = useState({
    date: getTodayString(),
    startTime: '18:00',
    durationMinutes: '60',
    guestCount: '2',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens with a table
  useEffect(() => {
    if (isOpen && table) {
      const defaultGuests = Math.min(2, table.seatingCapacity || 2);
      setFormData({
        date: getTodayString(),
        startTime: '18:00',
        durationMinutes: '60',
        guestCount: String(defaultGuests),
      });
      setFieldErrors({});
      setServerError('');
    }
  }, [isOpen, table]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !table) return null;

  const validate = () => {
    const errors = {};
    const today = getTodayString();

    if (!formData.date) {
      errors.date = 'Reservation date is required.';
    } else if (formData.date < today) {
      errors.date = 'Reservation date cannot be in the past.';
    }

    if (!formData.startTime) {
      errors.startTime = 'Start time is required.';
    } else {
      const [hours] = formData.startTime.split(':').map(Number);
      if (hours < 10 || hours > 21) {
        errors.startTime = 'Reservations are accepted between 10:00 and 22:00.';
      }
    }

    const guests = Number(formData.guestCount);
    if (!formData.guestCount || isNaN(guests) || guests < 1) {
      errors.guestCount = 'At least 1 guest is required.';
    } else if (guests > table.seatingCapacity) {
      errors.guestCount = `Maximum capacity for Table ${table.tableNumber} is ${table.seatingCapacity} guests.`;
    }

    const duration = Number(formData.durationMinutes);
    if (!duration || duration < 30 || duration > 240) {
      errors.durationMinutes = 'Duration must be between 30 and 240 minutes.';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');
    setFieldErrors({});

    try {
      const idempotencyKey = newIdempotencyKey();
      const payload = {
        tableId: table.tableId,
        date: formData.date,
        startTime: formData.startTime,
        durationMinutes: Number(formData.durationMinutes),
        guestCount: Number(formData.guestCount),
      };

      const confirmation = await createReservation(payload, idempotencyKey);
      if (onSuccess) {
        onSuccess(confirmation);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        const errors = err.response.data?.errors;
        if (errors) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(errors).map(([k, msgs]) => [k, msgs?.[0] || 'Invalid input'])
            )
          );
        } else {
          setServerError(err.response.data?.message || 'Invalid reservation details. Please check and try again.');
        }
      } else if (err.response?.status === 401) {
        setServerError('Your session has expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setServerError('Only registered customers can book a dining table.');
      } else if (err.response?.status === 404) {
        setServerError('The selected table is no longer available. Please select another table.');
      } else if (isBookingConflict(err)) {
        setServerError(
          'This table is already reserved for the selected time window. Please choose a different time slot or date.'
        );
      } else {
        setServerError(
          err.response?.data?.message || 'We could not complete your booking at this time. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookTableModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="bistro-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '2rem 2.25rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'glassCardReveal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bistro-bronze)' }}>
              Direct Table Booking
            </span>
            <h2
              id="bookTableModalTitle"
              style={{
                fontSize: '1.5rem',
                fontFamily: 'Georgia, serif',
                margin: '0.2rem 0 0 0',
                color: 'var(--bistro-ink)',
              }}
            >
              Reserve Table {table.tableNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#6b7280',
              padding: '0.35rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Selected Table Overview Card */}
        <div
          style={{
            backgroundColor: '#faf7f2',
            border: '1px solid #eee3cf',
            borderRadius: '10px',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--bistro-bronze)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--bistro-ink)' }}>
              {table.location || 'Main Dining'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--bistro-bronze)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span style={{ fontSize: '0.92rem', color: 'var(--bistro-muted)' }}>
              Up to <strong style={{ color: 'var(--bistro-ink)' }}>{table.seatingCapacity}</strong> guests
            </span>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              color: '#c53030',
              fontSize: '0.88rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
            {/* Date */}
            <div>
              <label
                htmlFor="book-date"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--bistro-ink)', marginBottom: '0.35rem' }}
              >
                Date *
              </label>
              <input
                id="book-date"
                type="date"
                name="date"
                min={getTodayString()}
                value={formData.date}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.date ? '1px solid #e53e3e' : '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.date && (
                <p style={{ color: '#e53e3e', fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>{fieldErrors.date}</p>
              )}
            </div>

            {/* Time */}
            <div>
              <label
                htmlFor="book-time"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--bistro-ink)', marginBottom: '0.35rem' }}
              >
                Time *
              </label>
              <input
                id="book-time"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.startTime ? '1px solid #e53e3e' : '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.startTime && (
                <p style={{ color: '#e53e3e', fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>{fieldErrors.startTime}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Guest Count */}
            <div>
              <label
                htmlFor="book-guests"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--bistro-ink)', marginBottom: '0.35rem' }}
              >
                Guests (Max {table.seatingCapacity}) *
              </label>
              <input
                id="book-guests"
                type="number"
                name="guestCount"
                min="1"
                max={table.seatingCapacity}
                value={formData.guestCount}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.guestCount ? '1px solid #e53e3e' : '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.guestCount && (
                <p style={{ color: '#e53e3e', fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>{fieldErrors.guestCount}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label
                htmlFor="book-duration"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--bistro-ink)', marginBottom: '0.35rem' }}
              >
                Duration
              </label>
              <select
                id="book-duration"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.durationMinutes ? '1px solid #e53e3e' : '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour (60 min)</option>
                <option value="90">1.5 hours (90 min)</option>
                <option value="120">2 hours (120 min)</option>
              </select>
              {fieldErrors.durationMinutes && (
                <p style={{ color: '#e53e3e', fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>{fieldErrors.durationMinutes}</p>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bistro-button-outline"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bistro-button-gold"
              style={{
                padding: '0.65rem 1.45rem',
                fontSize: '0.9rem',
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Confirming Booking…' : 'Confirm Booking →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

