import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import loginIllustration from '../../assets/images/login.png';

export default function Login({ onNavigateToRegister }) {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Auto-dismiss alert popups after 4.5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Validation errors shown strictly upon pressing submit
  const fieldErrors = useMemo(() => {
    if (!isSubmitted) return {};

    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    return errors;
  }, [formData, isSubmitted]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim()) || !formData.password) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password
      });

      setSuccess(true);
      setIsSubmitted(false);

      // Smooth redirect to portal
      setTimeout(() => {
        window.location.href = '/portal';
      }, 1200);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fullscreen-auth-container">
      {/* Left Column: Form & Brand Logo */}
      <div className="fullscreen-form-pane">
        <div className="fullscreen-brand-header">
          <img src="/logo.png" alt="Cinnamon Bistro Logo" className="fullscreen-logo" />
        </div>

        <div className="fullscreen-form-wrapper">
          <div className="auth-form-title-group">
            <h1>Welcome back</h1>
            <p>Please enter your details to sign in</p>
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

          {success && (
            <div className="alert alert-success" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Login Successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="loginEmail">Email address</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  id="loginEmail"
                  name="email"
                  className={`form-control with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}
                  placeholder="name@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <div className="error-text">{fieldErrors.email}</div>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <div className="input-icon-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPassword"
                  name="password"
                  className={`form-control with-icon with-action ${fieldErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
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
            </div>

            {/* Options Row: Remember Me & Forgot Password */}
            <div className="fullscreen-options-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span className="checkbox-custom">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#11141a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span className="checkbox-label">Remember for 30 days</span>
              </label>

              <a href="#forgot-password" className="forgot-password-link">
                Forgot password
              </a>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-primary fullscreen-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading-content">
                  <span className="spinner-icon" />
                  <span>Signing In...</span>
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Footer Navigation Link */}
            <div className="fullscreen-footer-note">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="link-button"
                onClick={onNavigateToRegister}
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Full-Height Image Column */}
      <div 
        className="fullscreen-image-pane"
        style={{ backgroundImage: `url(${loginIllustration})` }}
      >
        <div className="fullscreen-image-overlay" />
      </div>
    </div>
  );
}
