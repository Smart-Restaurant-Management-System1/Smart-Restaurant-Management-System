import React, { useState, useEffect } from 'react';
import { createTable } from '../../services/tableService';
import { validateTableForm, sanitizeTablePayload } from './tableValidation';

const LOCATION_OPTIONS = [
  'Main Dining',
  'Window',
  'Private Booth',
  'Patio',
  'Bar Area',
  'Balcony',
  'Other',
];

export default function AddTableModal({ isOpen, onClose, onTableCreated }) {
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: '4',
    location: 'Main Dining',
    customLocation: '',
    status: 'Available',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFieldErrors({});
    setServerError('');
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const resolvedLocation =
      formData.location === 'Other'
        ? formData.customLocation
        : formData.location;

    const dataToValidate = {
      tableNumber: formData.tableNumber,
      capacity: formData.capacity,
      location: resolvedLocation,
      status: formData.status,
    };

    const validation = validateTableForm(dataToValidate);
    if (!validation.isValid) {
      if (formData.location === 'Other' && validation.errors.location) {
        setFieldErrors({
          ...validation.errors,
          customLocation: validation.errors.location,
        });
      } else {
        setFieldErrors(validation.errors);
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload = sanitizeTablePayload(dataToValidate);
      const created = await createTable(payload);

      // Reset form and notify parent
      setFormData({
        tableNumber: '',
        capacity: '4',
        location: 'Main Dining',
        customLocation: '',
        status: 'Available',
      });
      if (onTableCreated) {
        onTableCreated(created);
      }
      handleClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Failed to create table. Please check the information and try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 13, 18, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.25rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e5e7eb',
          color: '#111827',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#d4af37',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Seating Configuration
            </span>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
              }}
            >
              Add Restaurant Table
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Table Number */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="tableNumber"
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.4rem',
              }}
            >
              Table Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="tableNumber"
              name="tableNumber"
              type="text"
              placeholder="e.g., T-06 or VIP-01"
              value={formData.tableNumber}
              onChange={handleChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.92rem',
                borderRadius: '8px',
                border: fieldErrors.tableNumber ? '1px solid #ef4444' : '1px solid #d1d5db',
                outline: 'none',
                color: '#111827',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
            {fieldErrors.tableNumber && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                {fieldErrors.tableNumber}
              </p>
            )}
          </div>

          {/* Seating Capacity */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="capacity"
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.4rem',
              }}
            >
              Seating Capacity <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              max="100"
              placeholder="e.g., 4"
              value={formData.capacity}
              onChange={handleChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.92rem',
                borderRadius: '8px',
                border: fieldErrors.capacity ? '1px solid #ef4444' : '1px solid #d1d5db',
                outline: 'none',
                color: '#111827',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
            {fieldErrors.capacity && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                {fieldErrors.capacity}
              </p>
            )}
          </div>

          {/* Location / Section */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="location"
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.4rem',
              }}
            >
              Location / Section <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.92rem',
                borderRadius: '8px',
                border: fieldErrors.location ? '1px solid #ef4444' : '1px solid #d1d5db',
                outline: 'none',
                color: '#111827',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {formData.location === 'Other' && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="text"
                  name="customLocation"
                  placeholder="Enter custom location/section name"
                  value={formData.customLocation}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.92rem',
                    borderRadius: '8px',
                    border: fieldErrors.customLocation ? '1px solid #ef4444' : '1px solid #d1d5db',
                    outline: 'none',
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.customLocation && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                    {fieldErrors.customLocation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ marginBottom: '2rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
              }}
            >
              Initial Status
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: formData.status === 'Available' ? '#111827' : '#6b7280',
                  fontWeight: formData.status === 'Available' ? '600' : '400',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value="Available"
                  checked={formData.status === 'Available'}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ accentColor: '#d4af37' }}
                />
                Available
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: formData.status === 'Inactive' ? '#111827' : '#6b7280',
                  fontWeight: formData.status === 'Inactive' ? '600' : '400',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={formData.status === 'Inactive'}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ accentColor: '#d4af37' }}
                />
                Inactive
              </label>
            </div>
            {fieldErrors.status && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                {fieldErrors.status}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.85rem',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn-jelly-secondary"
              style={{
                padding: '0.75rem 1.4rem',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-jelly-primary"
              style={{
                padding: '0.75rem 1.6rem',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg
                    style={{
                      animation: 'spin 1s linear infinite',
                      width: '16px',
                      height: '16px',
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
                  <span>Saving Table...</span>
                </>
              ) : (
                'Add Table'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
