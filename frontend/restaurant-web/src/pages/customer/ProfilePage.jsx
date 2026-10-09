import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import { validateProfileForm, sanitizeProfilePayload, formatProfileForForm, validatePasswordChangeForm } from './profileValidation';
import { ROLES } from '../../routes/roles';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
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
          if (updateUser && data) {
            updateUser({
              fullName: data.fullName,
              email: data.email,
              phoneNumber: data.phoneNumber,
            });
          }
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
      if (updateUser && updatedProfile) {
        updateUser({
          fullName: updatedProfile.fullName,
          email: updatedProfile.email,
          phoneNumber: updatedProfile.phoneNumber,
        });
      }
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

  // Password Change State (SR-224 / SR-254)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Auto-dismiss password alerts
  useEffect(() => {
    if (passwordError || passwordSuccess) {
      const timer = setTimeout(() => {
        setPasswordError(null);
        setPasswordSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordError, passwordSuccess]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
    setPasswordError(null);
  };

  const handlePasswordClear = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordFieldErrors({});
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const validation = validatePasswordChangeForm(passwordData);
    if (!validation.isValid) {
      setPasswordFieldErrors(validation.errors);
      return;
    }

    setPasswordFieldErrors({});
    setIsChangingPassword(true);

    try {
      await changeUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.message) {
        setPasswordError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const apiErrors = {};
        for (const [key, messages] of Object.entries(err.response.data.errors)) {
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          apiErrors[lowerKey] = Array.isArray(messages) ? messages[0] : messages;
        }
        setPasswordFieldErrors(apiErrors);
        setPasswordError('Please correct the validation errors below.');
      } else if (err.response?.status === 401) {
        setPasswordError('Your session has expired. Please sign in again.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setPasswordError('Failed to change password. Please check your credentials and try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'CB';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CB';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleDisplay = (roles) => {
    if (roles?.includes(ROLES.ADMIN)) {
      return {
        label: 'Administrator',
        bg: '#fbf4e6',
        color: '#8c6736',
        border: '#edd9b5',
        authorization: 'Full Administrative Privileges',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      };
    }
    if (roles?.includes(ROLES.KITCHEN_STAFF)) {
      return {
        label: 'Kitchen Specialist',
        bg: '#fbf4ee',
        color: '#9c5b28',
        border: '#eed2c0',
        authorization: 'Kitchen Queue & Operations',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      };
    }
    return {
      label: 'Dining Guest',
      bg: '#f4f8f4',
      color: '#286835',
      border: '#cde4d2',
      authorization: 'Table Booking & Dining Access',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18v3" />
          <path d="M20 18v3" />
          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
        </svg>
      ),
    };
  };

  const roleDisplay = getRoleDisplay(originalProfile?.roles || user?.roles);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '350px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#111827',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            border: '3px solid rgba(197, 160, 89, 0.25)',
            borderTopColor: '#c5a059',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '0.85rem',
          }}
        />
        <p style={{ color: '#78716c', fontSize: '0.9rem', fontStyle: 'italic' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-content profile-no-scroll-container">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Account Settings"
        title={<>Account <em>Profile</em></>}
        subtitle="View and manage your personal credentials, contact details, and dining privileges."
      />

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            marginBottom: '0.85rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
          }}
        >
          <svg
            width="16"
            height="16"
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
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="alert"
          style={{
            background: '#edf7ee',
            border: '1px solid #c2e2c6',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            marginBottom: '0.85rem',
            color: '#1e5e29',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
          }}
        >
          <svg
            width="18"
            height="18"
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
          <span style={{ fontWeight: 500 }}>Profile updated successfully!</span>
        </div>
      )}

      {/* Executive Split Card */}
      <div className="profile-split-card">
        {/* Top Gold Accent Strip */}
        <div className="profile-card-accent-bar" />

        {/* Identity & Access Overview Banner */}
        <div className="profile-identity-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            {/* Left: User Avatar + Identity + Status Badges */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f5efe6 0%, #ecd6aa 100%)',
                    border: '2px solid #c5a059',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#282115',
                    boxShadow: '0 3px 10px rgba(197, 160, 89, 0.2)',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(formData.fullName || user?.fullName)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#282115',
                      margin: 0,
                      lineHeight: 1.25,
                      wordBreak: 'break-word',
                    }}
                  >
                    {formData.fullName || user?.fullName || 'Bistro User'}
                  </h2>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#78716c',
                      marginTop: '0.15rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {formData.email || user?.email || 'No email registered'}
                  </div>
                </div>
              </div>

              {/* Role & Status Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.24rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    background: roleDisplay.bg,
                    color: roleDisplay.color,
                    border: `1px solid ${roleDisplay.border}`,
                  }}
                >
                  {roleDisplay.icon}
                  {roleDisplay.label}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.24rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: originalProfile?.isActive !== false ? '#ecfdf5' : '#fef2f2',
                    color: originalProfile?.isActive !== false ? '#15803d' : '#991b1b',
                    border: `1px solid ${originalProfile?.isActive !== false ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {originalProfile?.isActive !== false && <span className="profile-avatar-pulse-dot" />}
                  {originalProfile?.isActive !== false ? 'Active Account' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Right: Account Metadata (User ID, Member Since, Access Tier) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto auto',
                gap: '0.5rem 1.5rem',
                fontSize: '0.8rem',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#78716c', fontWeight: 500 }}>User ID</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#282115',
                  fontSize: '0.82rem',
                  textAlign: 'right',
                }}
              >
                #{originalProfile?.userId || user?.userId || 'N/A'}
              </span>

              <span style={{ color: '#78716c', fontWeight: 500 }}>Member Since</span>
              <span style={{ fontWeight: 600, color: '#282115', textAlign: 'right' }}>
                {originalProfile?.createdAt
                  ? new Date(originalProfile.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent'}
              </span>

              <span style={{ color: '#78716c', fontWeight: 500 }}>Access Tier</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: '#15803d',
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Personal Details Form */}
        <div className="profile-form-panel">
          <div>
            <div style={{ marginBottom: '0.85rem' }}>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.05rem', fontWeight: 600, color: '#282115', margin: 0 }}>
                Personal Information
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#78716c', margin: '0.2rem 0 0' }}>
                Update your contact details for reservations, dining notifications, and account credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="profile-form-grid">
                {/* Full Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="profileFullName" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    Full Name <span style={{ color: '#c5a059' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c5a059"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      id="profileFullName"
                      name="fullName"
                      className={`profile-input-field with-icon ${fieldErrors.fullName ? 'is-invalid' : ''}`}
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={isSaving}
                      style={{ paddingLeft: '2.55rem' }}
                    />
                  </div>
                  {fieldErrors.fullName && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{fieldErrors.fullName}</div>}
                </div>

                {/* Email Address - Fixed & Locked for Customers (SR-224) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="profileEmail" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    Email Address
                  </label>
                  <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8c6736"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type="email"
                      id="profileEmail"
                      name="email"
                      className="profile-input-field with-icon"
                      placeholder="name@domain.com"
                      value={formData.email}
                      readOnly
                      disabled
                      style={{
                        paddingLeft: '2.55rem',
                        backgroundColor: '#f9f6f0',
                        color: '#6b7280',
                        cursor: 'not-allowed',
                        borderColor: '#e5dacf',
                      }}
                      title="Account email address is permanent and cannot be modified."
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8c7e6c', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Account email is permanent and cannot be modified.
                  </div>
                </div>

                {/* Phone Number */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="profilePhone" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    Phone Number
                  </label>
                  <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c5a059"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <input
                      type="tel"
                      id="profilePhone"
                      name="phoneNumber"
                      className={`profile-input-field with-icon ${fieldErrors.phoneNumber ? 'is-invalid' : ''}`}
                      placeholder="+1 555-0199"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      disabled={isSaving}
                      style={{ paddingLeft: '2.55rem' }}
                    />
                  </div>
                  {fieldErrors.phoneNumber && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{fieldErrors.phoneNumber}</div>}
                </div>

                {/* System Permissions (Read-only status card that completes the 2x2 grid) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    System Authorization
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.52rem 0.85rem',
                      background: '#faf7f2',
                      border: '1px solid #eedfc9',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      color: '#282115',
                      fontWeight: 500,
                      minHeight: '38px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8c6736" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {roleDisplay.authorization}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginTop: '1.25rem',
                  paddingTop: '0.95rem',
                  borderTop: '1px solid #eedfc9',
                }}
              >
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bistro-button-gold"
                  style={{ padding: '0.48rem 1.25rem', fontSize: '0.86rem' }}
                >
                  {isSaving ? (
                    <>
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: '2px solid #282115',
                          borderTopColor: 'transparent',
                          animation: 'spin 0.75s linear infinite',
                        }}
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="bistro-button-outline"
                  style={{ padding: '0.48rem 0.95rem', fontSize: '0.86rem' }}
                  title="Revert to previously saved values"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>Reset</span>
                </button>
              </div>
            </form>

            {/* Account Security & Password Change Section (SR-224 / SR-254) */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '2px dashed #eedfc9' }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.05rem', fontWeight: 600, color: '#282115', margin: 0 }}>
                  Account Security & Password
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#78716c', margin: '0.2rem 0 0' }}>
                  Update your password by providing your current credentials and a new secure password.
                </p>
              </div>

              {/* Password Specific Alerts */}
              {passwordError && (
                <div
                  role="alert"
                  style={{
                    background: '#fff5f5',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '0.55rem 0.9rem',
                    marginBottom: '0.85rem',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ fontWeight: 500 }}>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div
                  role="alert"
                  style={{
                    background: '#edf7ee',
                    border: '1px solid #c2e2c6',
                    borderRadius: '8px',
                    padding: '0.55rem 0.9rem',
                    marginBottom: '0.85rem',
                    color: '#1e5e29',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span style={{ fontWeight: 500 }}>Password updated successfully!</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                  {/* Current Password */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="currentPassword" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      Current Password <span style={{ color: '#c5a059' }}>*</span>
                    </label>
                    <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="currentPassword"
                        name="currentPassword"
                        className={`profile-input-field with-icon ${passwordFieldErrors.currentPassword ? 'is-invalid' : ''}`}
                        placeholder="••••••••"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={isChangingPassword}
                        style={{ paddingLeft: '2.55rem', paddingRight: '2.3rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ position: 'absolute', right: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#78716c', display: 'flex', alignItems: 'center' }}
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordFieldErrors.currentPassword && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{passwordFieldErrors.currentPassword}</div>}
                  </div>

                  {/* New Password */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="newPassword" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      New Password <span style={{ color: '#c5a059' }}>*</span>
                    </label>
                    <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        name="newPassword"
                        className={`profile-input-field with-icon ${passwordFieldErrors.newPassword ? 'is-invalid' : ''}`}
                        placeholder="Min. 6 chars"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        disabled={isChangingPassword}
                        style={{ paddingLeft: '2.55rem', paddingRight: '2.3rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: 'absolute', right: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#78716c', display: 'flex', alignItems: 'center' }}
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordFieldErrors.newPassword && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{passwordFieldErrors.newPassword}</div>}
                  </div>

                  {/* Confirm New Password */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="confirmPassword" style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      Confirm New Password <span style={{ color: '#c5a059' }}>*</span>
                    </label>
                    <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.8rem', pointerEvents: 'none', zIndex: 2 }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        className={`profile-input-field with-icon ${passwordFieldErrors.confirmPassword ? 'is-invalid' : ''}`}
                        placeholder="Repeat new password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        disabled={isChangingPassword}
                        style={{ paddingLeft: '2.55rem', paddingRight: '2.3rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#78716c', display: 'flex', alignItems: 'center' }}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordFieldErrors.confirmPassword && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{passwordFieldErrors.confirmPassword}</div>}
                  </div>
                </div>

                {/* Password Actions Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    marginTop: '1.25rem',
                    paddingTop: '0.95rem',
                    borderTop: '1px solid #eedfc9',
                  }}
                >
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bistro-button-gold"
                    style={{ padding: '0.48rem 1.25rem', fontSize: '0.86rem' }}
                  >
                    {isChangingPassword ? (
                      <>
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: '2px solid #282115',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.75s linear infinite',
                          }}
                        />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePasswordClear}
                    disabled={isChangingPassword}
                    className="bistro-button-outline"
                    style={{ padding: '0.48rem 0.95rem', fontSize: '0.86rem' }}
                    title="Clear password fields"
                  >
                    <span>Clear</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
