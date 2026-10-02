import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { submitFeedback, getMyFeedback } from '../../services/feedbackService';
import { validateFeedback } from '../../utils/feedbackValidation';

// SVG Icons matching Cinnamon Bistro luxury tokens
const IconStar = ({ filled = false, size = 22, color = '#d4af37' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : 'none'}
    stroke={filled ? color : '#cbbea7'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'all 0.15s ease' }}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCheckCircle = ({ size = 20, color = '#166534' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconAlertCircle = ({ size = 20, color = '#9f1239' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconUtensils = ({ size = 20, color = '#a87942' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
    <path d="M15 2v20" />
    <path d="M7 2v20" />
    <path d="M4 2v5a3 3 0 0 0 6 0V2" />
  </svg>
);

const IconCalendar = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconReceipt = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="12" y2="15" />
  </svg>
);

export default function CustomerFeedbackPage() {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [linkType, setLinkType] = useState('none'); // 'none' | 'reservation' | 'order'
  const [reservationId, setReservationId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderType, setOrderType] = useState('DineIn');

  const [loading, setLoading] = useState(false);
  const [feedbackListLoading, setFeedbackListLoading] = useState(true);
  const [previousFeedbacks, setPreviousFeedbacks] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const ratingDescriptions = {
    1: '1 Star — Disappointing, needs major improvement',
    2: '2 Stars — Below expectations, several shortcomings',
    3: '3 Stars — Average, satisfactory experience',
    4: '4 Stars — Very good, enjoyable food & service',
    5: '5 Stars — Exceptional, culinary perfection!',
  };

  const fetchPreviousFeedbacks = async () => {
    try {
      setFeedbackListLoading(true);
      const data = await getMyFeedback();
      setPreviousFeedbacks(data || []);
    } catch {
      // Non-critical, ignore on first load
    } finally {
      setFeedbackListLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviousFeedbacks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});

    const validation = validateFeedback({ rating, comment });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    const payload = {
      rating,
      comment: validation.sanitizedComment,
      reservationId: linkType === 'reservation' && reservationId ? parseInt(reservationId, 10) : null,
      orderId: linkType === 'order' && orderId ? parseInt(orderId, 10) : null,
      orderType: linkType === 'order' ? orderType : null,
    };

    setLoading(true);
    try {
      await submitFeedback(payload);
      setSuccessMessage('Thank you for your valuable feedback! Your review helps Cinnamon Bistro continuously refine its culinary craftsmanship.');
      setComment('');
      setReservationId('');
      setOrderId('');
      setLinkType('none');
      setRating(5);
      await fetchPreviousFeedbacks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit feedback. Please verify your details.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStarVisual = (count, size = 16) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <IconStar key={s} filled={s <= count} size={size} color="#d4af37" />
      ))}
    </div>
  );

  return (
    <div className="portal-page-content" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="GUEST IMPRESSIONS & RATINGS"
        title={<>Share Your Dining <em>Impressions.</em></>}
        subtitle="Your honest reviews inspire our culinary team and service staff to maintain the highest gastronomic standards and warm hospitality."
      />

      {/* Success Notification Banner */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem 1.4rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <IconCheckCircle size={22} color="#166534" />
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#166534' }}>
              {successMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#166534',
              fontSize: '1.1rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '1rem 1.4rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <IconAlertCircle size={22} color="#9f1239" />
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#9f1239' }}>
              {errorMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9f1239',
              fontSize: '1.1rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Dual-Pane Content Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Pane: Review Submission Form */}
        <section
          className="bistro-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #e8e0d0',
            borderRadius: '14px',
            boxShadow: '0 6px 22px rgba(40, 30, 15, 0.05)',
            padding: '2rem',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Top Gold Gradient Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.65rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUtensils size={22} color="#a87942" />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.38rem',
                  fontWeight: 700,
                  color: 'var(--bistro-ink, #28251f)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Rate Your Experience
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--bistro-muted, #6b6357)' }}>
                Tell us about your culinary journey, ambiance, and hospitality
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.45rem' }}>
            {/* Star Rating Control */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--bistro-ink)',
                  marginBottom: '0.6rem',
                  letterSpacing: '0.02em',
                }}
              >
                Overall Rating <span style={{ color: '#be123c' }}>*</span>
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.6rem',
                }}
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isActive = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                      }}
                      aria-label={`${starValue} star`}
                    >
                      <IconStar
                        filled={isActive}
                        size={34}
                        color={isActive ? '#d4af37' : '#d9d0bf'}
                      />
                    </button>
                  );
                })}

                <span
                  style={{
                    marginLeft: '0.65rem',
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#8c6736',
                  }}
                >
                  {hoverRating || rating}.0
                </span>
              </div>

              {/* Dynamic Description Pill */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: '#faf5ec',
                  border: '1px solid #eedfc9',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#8c6736',
                }}
              >
                {ratingDescriptions[hoverRating || rating]}
              </div>

              {fieldErrors.rating && (
                <p style={{ fontSize: '0.8rem', color: '#be123c', marginTop: '0.4rem', fontWeight: 500 }}>
                  {fieldErrors.rating}
                </p>
              )}
            </div>

            {/* Visit Association Option */}
            <div style={{ paddingTop: '1.2rem', borderTop: '1px solid #eee6d8' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--bistro-ink)',
                  marginBottom: '0.65rem',
                }}
              >
                Link to Dining Booking or Order (Optional)
              </label>

              {/* Segmented Radio Options */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                }}
              >
                {[
                  { id: 'none', label: 'General Experience', icon: <IconUtensils size={15} color={linkType === 'none' ? '#ffffff' : '#8c6736'} /> },
                  { id: 'reservation', label: 'Table Reservation', icon: <IconCalendar size={15} color={linkType === 'reservation' ? '#ffffff' : '#8c6736'} /> },
                  { id: 'order', label: 'Food Order', icon: <IconReceipt size={15} color={linkType === 'order' ? '#ffffff' : '#8c6736'} /> },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLinkType(option.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 0.95rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: linkType === option.id ? '1px solid #8c6736' : '1px solid #dfd8cb',
                      backgroundColor: linkType === option.id ? '#8c6736' : '#faf8f4',
                      color: linkType === option.id ? '#ffffff' : 'var(--bistro-ink)',
                      transition: 'all 0.15s ease',
                      boxShadow: linkType === option.id ? '0 2px 6px rgba(140, 103, 54, 0.2)' : 'none',
                    }}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              {linkType === 'reservation' && (
                <div style={{ backgroundColor: '#faf6ef', border: '1px solid #eedfc9', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
                  <label htmlFor="resIdInput" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#8c6736', marginBottom: '0.35rem' }}>
                    Reservation ID
                  </label>
                  <input
                    id="resIdInput"
                    type="number"
                    min="1"
                    placeholder="e.g. 102"
                    value={reservationId}
                    onChange={(e) => setReservationId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d9d0bf',
                      borderRadius: '7px',
                      fontSize: '0.88rem',
                      color: 'var(--bistro-ink)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.74rem', color: 'var(--bistro-muted)' }}>
                    Found in your Reservation History (e.g., Booking #102).
                  </p>
                </div>
              )}

              {linkType === 'order' && (
                <div style={{ backgroundColor: '#faf6ef', border: '1px solid #eedfc9', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label htmlFor="orderIdInput" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#8c6736', marginBottom: '0.35rem' }}>
                      Order ID
                    </label>
                    <input
                      id="orderIdInput"
                      type="number"
                      min="1"
                      placeholder="e.g. 54"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d9d0bf',
                        borderRadius: '7px',
                        fontSize: '0.88rem',
                        color: 'var(--bistro-ink)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="orderTypeSelect" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#8c6736', marginBottom: '0.35rem' }}>
                      Order Classification
                    </label>
                    <select
                      id="orderTypeSelect"
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d9d0bf',
                        borderRadius: '7px',
                        fontSize: '0.88rem',
                        color: 'var(--bistro-ink)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="DineIn">Dine-In Order</option>
                      <option value="ReservationPreOrder">Reservation Pre-Order</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Section */}
            <div style={{ paddingTop: '1.2rem', borderTop: '1px solid #eee6d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label
                  htmlFor="commentInput"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--bistro-ink)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Your Comments & Review {rating <= 3 && <span style={{ color: '#be123c' }}>*</span>}
                </label>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: comment.length > 950 ? '#be123c' : 'var(--bistro-muted)',
                  }}
                >
                  {comment.length} / 1000
                </span>
              </div>

              <textarea
                id="commentInput"
                rows={4}
                maxLength={1000}
                placeholder={
                  rating <= 3
                    ? 'Please share details on how we can improve your dining experience (minimum 5 characters)...'
                    : 'Share details of your favorite dishes, our hospitality, or the dining ambiance (optional)...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.95rem',
                  backgroundColor: '#faf8f4',
                  border: fieldErrors.comment ? '1px solid #be123c' : '1px solid #d9d0bf',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  color: 'var(--bistro-ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />

              {fieldErrors.comment ? (
                <p style={{ fontSize: '0.8rem', color: '#be123c', marginTop: '0.35rem', fontWeight: 600 }}>
                  {fieldErrors.comment}
                </p>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--bistro-muted)', marginTop: '0.35rem' }}>
                  {rating <= 3
                    ? 'A comment is required for ratings of 3 stars or lower to help us promptly address your concerns.'
                    : 'Comments are optional for 4 and 5-star ratings.'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setComment('');
                  setReservationId('');
                  setOrderId('');
                  setLinkType('none');
                  setRating(5);
                  setFieldErrors({});
                }}
                className="bistro-button-outline"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={loading}
                className="bistro-button-gold"
                style={{
                  padding: '0.65rem 1.65rem',
                  minWidth: '180px',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </section>

        {/* Right Pane: Commitment & Previous Feedback History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Commitment Card */}
          <div
            className="bistro-card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #e8e0d0',
              borderRadius: '14px',
              backgroundColor: '#faf6ee',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 100%)',
              }}
            />
            <h3
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#6e5129',
                margin: '0 0 0.5rem 0',
              }}
            >
              Our Commitment to Excellence
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                lineHeight: 1.6,
                color: 'var(--bistro-muted, #6b6357)',
              }}
            >
              Every dining impression is personally reviewed by executive management and chef directors. Your feedback directly shapes our seasonal menu creations and ensures exceptional culinary experiences.
            </p>
          </div>

          {/* Previous Feedbacks Card */}
          <section
            className="bistro-card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #e8e0d0',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(40, 30, 15, 0.04)',
              padding: '1.65rem',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #8c6736 0%, #ddbb78 100%)',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.22rem',
                    fontWeight: 700,
                    color: 'var(--bistro-ink)',
                    margin: 0,
                  }}
                >
                  Your Previous Reviews
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--bistro-muted)' }}>
                  Historical ratings submitted from this account
                </span>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  backgroundColor: '#eee3cf',
                  border: '1px solid #c5b699',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#6b532f',
                }}
              >
                {previousFeedbacks.length} {previousFeedbacks.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {feedbackListLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--bistro-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>Loading your previous reviews...</p>
              </div>
            ) : previousFeedbacks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1.5rem',
                  backgroundColor: '#faf8f4',
                  border: '1px dashed #d9d0bf',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#eee3cf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <IconStar filled size={22} color="#a87942" />
                </div>
                <h4 style={{ fontFamily: 'Georgia, serif', margin: '0 0 0.35rem', fontSize: '0.96rem', color: 'var(--bistro-ink)' }}>
                  No feedback recorded yet
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--bistro-muted)', lineHeight: 1.5 }}>
                  Your submitted ratings and experience critiques will be archived here for easy reference.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {previousFeedbacks.map((fb) => (
                  <div
                    key={fb.feedbackId}
                    style={{
                      backgroundColor: '#faf8f4',
                      border: '1px solid #ebdcc5',
                      borderRadius: '10px',
                      padding: '1.05rem',
                      boxShadow: '0 2px 8px rgba(40, 30, 15, 0.03)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        {renderStarVisual(fb.rating, 16)}
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8c6736' }}>
                          {fb.rating}.0
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--bistro-muted)' }}>
                        {new Date(fb.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {(fb.bookingReference || fb.orderReference) && (
                      <div style={{ marginBottom: '0.55rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#eee3cf',
                            color: '#6b532f',
                            border: '1px solid #c5b699',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {fb.bookingReference ? `Booking #${fb.bookingReference}` : fb.orderReference}
                        </span>
                      </div>
                    )}

                    {fb.comment ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.82rem',
                          fontStyle: 'italic',
                          color: 'var(--bistro-ink)',
                          lineHeight: 1.55,
                          backgroundColor: '#ffffff',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '6px',
                          borderLeft: '3px solid #c5a059',
                        }}
                      >
                        “{fb.comment}”
                      </p>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--bistro-muted)' }}>
                        No written comments provided.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
