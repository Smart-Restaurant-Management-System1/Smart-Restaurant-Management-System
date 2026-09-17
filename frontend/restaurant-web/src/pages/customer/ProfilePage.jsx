import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import { validateProfileForm, sanitizeProfilePayload, formatProfileForForm } from './profileValidation';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });

  const [originalProfile, setOriginalProfile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Auto-dismiss alerts
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Load fresh profile from database on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getUserProfile();
        if (isMounted) {
          setOriginalProfile(data);
          setFormData(formatProfileForForm(data));
        }
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 401) {
            setError('Your session has expired. Please sign in again.');
            setTimeout(() => navigate('/login'), 1500);
          } else if (err.response?.data?.message) {
            setError(err.response.data.message);
          } else {
            setError('Unable to load profile data. Please try again later.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
    setError(null);
  };

  const handleReset = () => {
    if (originalProfile) {
      setFormData(formatProfileForForm(originalProfile));
      setFieldErrors({});
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation
    const validation = validateProfileForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      const payload = sanitizeProfilePayload(formData);
      const updatedProfile = await updateUserProfile(payload);

      setOriginalProfile(updatedProfile);
      setFormData(formatProfileForForm(updatedProfile));
      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          email: err.response.data?.message || 'Email is already in use by another account',
        }));
        setError(err.response.data?.message || 'Email is already in use by another account');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Validation errors from ASP.NET ModelState
        const apiErrors = {};
        for (const [key, messages] of Object.entries(err.response.data.errors)) {
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          apiErrors[lowerKey] = Array.isArray(messages) ? messages[0] : messages;
        }
        setFieldErrors(apiErrors);
        setError('Please correct the errors in the form.');
      } else {
        setError('Failed to update profile. Please try again later.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#111827',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(212, 175, 55, 0.25)',
            borderTopColor: '#d4af37',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Loading customer profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Unified Page Header */}
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Account Settings"
        title={<>Account <em>Profile</em></>}
        subtitle="View and update your personal details, contact information, and role access."
      />

      {/* Alerts */}
      {error && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#991b1b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ background: '#edf7ee', border: '1px solid #c2e2c6', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#1e5e29', display: 'flex', alignItems: 'center', gap: '0.75rem' }} role="alert">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2e7d32"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Read-Only Account Summary Banner */}
      <div className="bistro-info-banner">
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--bistro-bronze)', fontWeight: '700', letterSpacing: '0.08em' }}>
            Account Status
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--bistro-ink)', marginTop: '0.2rem' }}>
            {originalProfile?.isActive !== false ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--bistro-bronze)', fontWeight: '700', letterSpacing: '0.08em' }}>
            Assigned Role
          </div>
          <div style={{ marginTop: '0.2rem' }}>
            <span className="bistro-info-tag">
              {originalProfile?.roles?.join(', ') || 'Customer'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--bistro-bronze)', fontWeight: '700', letterSpacing: '0.08em' }}>
            Member Since
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--bistro-muted)', marginTop: '0.2rem' }}>
            {originalProfile?.createdAt
              ? new Date(originalProfile.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Profile Edit Form Card */}
      <div className="bistro-card" style={{ padding: '2.5rem 2rem' }}>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="profileFullName" style={{ display: 'block', color: '#374151', fontWeight: '500', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg
                className="input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d4af37"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '1rem', pointerEvents: 'none' }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                id="profileFullName"
                name="fullName"
                className={`form-control with-icon ${fieldErrors.fullName ? 'is-invalid' : ''}`}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.78rem 1rem 0.78rem 2.85rem',
                  fontSize: '0.95rem',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  border: fieldErrors.fullName ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>
            {fieldErrors.fullName && <div className="error-text" style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.35rem' }}>{fieldErrors.fullName}</div>}
          </div>

          {/* Email Address */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="profileEmail" style={{ display: 'block', color: '#374151', fontWeight: '500', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg
                className="input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d4af37"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '1rem', pointerEvents: 'none' }}
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                id="profileEmail"
                name="email"
                className={`form-control with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}
                placeholder="name@domain.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.78rem 1rem 0.78rem 2.85rem',
                  fontSize: '0.95rem',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  border: fieldErrors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>
            {fieldErrors.email && <div className="error-text" style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.35rem' }}>{fieldErrors.email}</div>}
          </div>

          {/* Phone Number */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="profilePhone" style={{ display: 'block', color: '#374151', fontWeight: '500', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Phone Number
            </label>
            <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg
                className="input-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d4af37"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '1rem', pointerEvents: 'none' }}
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <input
                type="tel"
                id="profilePhone"
                name="phoneNumber"
                className={`form-control with-icon ${fieldErrors.phoneNumber ? 'is-invalid' : ''}`}
                placeholder="+1 555-0199"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.78rem 1rem 0.78rem 2.85rem',
                  fontSize: '0.95rem',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  border: fieldErrors.phoneNumber ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>
            {fieldErrors.phoneNumber && <div className="error-text" style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.35rem' }}>{fieldErrors.phoneNumber}</div>}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="bistro-button-gold"
            >
              {isSaving ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid #282115',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.75s linear infinite',
                    }}
                  />
                  <span>Saving Changes...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/portal')}
              disabled={isSaving}
              className="bistro-button-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
