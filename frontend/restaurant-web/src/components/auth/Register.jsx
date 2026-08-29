import React, { useState, useMemo, useEffect } from 'react';
import { registerUser } from '../../services/authService';

export default function Register() {
  const [accountType, setAccountType] = useState('Customer'); // 'Customer' or 'Staff'

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'Customer',
    staffAuthorizationCode: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Auto-dismiss alert popups after 4.5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successData) {
      const timer = setTimeout(() => setSuccessData(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [successData]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444', percent: '33%' };
    if (score <= 4) return { score: 2, label: 'Medium', color: '#eab308', percent: '66%' };
    return { score: 3, label: 'Strong', color: '#22c55e', percent: '100%' };
  }, [formData.password]);

  // Validation errors shown strictly upon pressing submit
  const fieldErrors = useMemo(() => {
    if (!isSubmitted) return {};

    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.phoneNumber && !/^[+0-9\s-]{7,15}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Valid phone format: 7 to 15 digits';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (accountType === 'Staff') {
      if (!formData.staffAuthorizationCode.trim()) {
        errors.staffAuthorizationCode = 'Staff authorization code is required';
      }
    }

    return errors;
  }, [formData, isSubmitted, accountType]);

  const handleAccountTypeChange = (type) => {
    setAccountType(type);
    setFormData((prev) => ({
      ...prev,
      role: type === 'Customer' ? 'Customer' : (prev.role === 'Customer' ? 'KitchenStaff' : prev.role),
      staffAuthorizationCode: ''
    }));
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isBasicValid =
      formData.fullName.trim().length >= 2 &&
      emailRegex.test(formData.email.trim()) &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword;

    const isStaffValid = accountType !== 'Staff' || formData.staffAuthorizationCode.trim().length > 0;

    if (!isBasicValid || !isStaffValid) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        password: formData.password,
        role: accountType === 'Customer' ? 'Customer' : formData.role,
        staffAuthorizationCode: accountType === 'Staff' ? formData.staffAuthorizationCode.trim() : null
      };

      const result = await registerUser(payload);
      setSuccessData(result);
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: accountType === 'Customer' ? 'Customer' : 'KitchenStaff',
        staffAuthorizationCode: ''
      });
      setIsSubmitted(false);

      // Redirect to portal
      setTimeout(() => {
        window.location.href = '/portal';
      }, 1200);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to connect to the backend server. Please verify Identity Service is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-card">
      {/* Left Side: Brand Showcase & Atmosphere */}
      <div className="auth-banner-side">
        <div className="banner-overlay">
          <div className="banner-content">
            <div className="banner-logo-wrapper">
              <img src="/logo.png" alt="Cinnamon Bistro Logo" className="banner-logo" />
            </div>
            <h3 className="banner-title">Culinary Distinction & Hospitality</h3>
            <p className="banner-subtitle">
              {accountType === 'Customer'
                ? 'Join our exclusive dining society to access bespoke tasting menus, premier reservations, and personalized experiences.'
                : 'Staff & management portal for culinary operations, kitchen workflows, and administration.'}
            </p>

            <div className="banner-perks">
              <div className="perk-item">
                <span className="perk-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <span>{accountType === 'Customer' ? 'Priority Table Reservations & Pre-Ordering' : 'Kitchen Order & Menu Management'}</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 22h8"></path>
                    <path d="M12 15v7"></path>
                    <path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0L5 3z"></path>
                  </svg>
                </span>
                <span>{accountType === 'Customer' ? "Curated Chef's Tasting Menus & Pairings" : 'Real-Time Preparation Queue'}</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </span>
                <span>{accountType === 'Customer' ? 'Seamless Digital Dining & Guest Profile' : 'Role-Based Executive Administration'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="auth-form-side">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>
            {accountType === 'Customer'
              ? 'Begin your fine dining journey with Cinnamon Bistro'
              : 'Register your staff or administrative account'}
          </p>
        </div>

        {/* Account Type Selection Tabs */}
        <div className="account-type-tabs">
          <button
            type="button"
            className={`tab-btn ${accountType === 'Customer' ? 'active' : ''}`}
            onClick={() => handleAccountTypeChange('Customer')}
          >
            Dining Guest
          </button>
          <button
            type="button"
            className={`tab-btn ${accountType === 'Staff' ? 'active' : ''}`}
            onClick={() => handleAccountTypeChange('Staff')}
          >
            Staff & Management
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successData && (
          <div className="alert alert-success" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Registration Successful!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <div className="input-icon-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className={`form-control with-icon ${fieldErrors.fullName ? 'is-invalid' : ''}`}
                placeholder="e.g. Alexander Vance"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.fullName && <div className="error-text">{fieldErrors.fullName}</div>}
          </div>

          {/* Email & Phone Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-control with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}
                  placeholder="alexander@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.email && <div className="error-text">{fieldErrors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  className={`form-control with-icon ${fieldErrors.phoneNumber ? 'is-invalid' : ''}`}
                  placeholder="+94 77 123 4567"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.phoneNumber && <div className="error-text">{fieldErrors.phoneNumber}</div>}
            </div>
          </div>

          {/* Passwords Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`form-control with-icon with-action ${fieldErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <div className="error-text">{fieldErrors.password}</div>}

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="strength-meter">
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{
                        width: passwordStrength.percent,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`form-control with-icon with-action ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && <div className="error-text">{fieldErrors.confirmPassword}</div>}
            </div>
          </div>

          {/* Smooth Expanding Staff Fields */}
          <div className={`staff-expand-wrapper ${accountType === 'Staff' ? 'open' : ''}`}>
            <div className="staff-expand-inner">
              <div className="staff-fields-section">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="role">Staff Role *</label>
                    <div className="input-icon-wrapper select-wrapper">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                      <select
                        id="role"
                        name="role"
                        className="form-control with-icon custom-select"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="KitchenStaff">Kitchen & Culinary Staff</option>
                        <option value="Admin">Restaurant Management / Admin</option>
                      </select>
                      <div className="select-chevron">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="staffAuthorizationCode">Staff Passcode *</label>
                    <div className="input-icon-wrapper">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2l-2 2m-1.5 1.5L12 11l-4-4-5 5a2.12 2.12 0 0 0 3 3l3-3 5.5 5.5 1.5-1.5"></path>
                        <circle cx="17.5" cy="6.5" r="2.5"></circle>
                      </svg>
                      <input
                        type="password"
                        id="staffAuthorizationCode"
                        name="staffAuthorizationCode"
                        className={`form-control with-icon ${fieldErrors.staffAuthorizationCode ? 'is-invalid' : ''}`}
                        placeholder="Enter company key"
                        value={formData.staffAuthorizationCode}
                        onChange={handleChange}
                      />
                    </div>
                    {fieldErrors.staffAuthorizationCode && (
                      <div className="error-text">{fieldErrors.staffAuthorizationCode}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button with Smooth Loading Spinner */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading-content">
                <span className="spinner-icon" />
                <span>Creating Account...</span>
              </span>
            ) : (
              accountType === 'Customer' ? 'Register Guest Account' : 'Register Staff Account'
            )}
          </button>

          {/* Footer note */}
          <div className="form-footer-note">
            <span>Already have an account? </span>
            <a href="#login" className="login-link">Sign In</a>
          </div>
        </form>
      </div>
    </div>
  );
}
