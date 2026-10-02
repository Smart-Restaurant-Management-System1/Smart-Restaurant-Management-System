import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { submitFeedback, getMyFeedback } from '../../services/feedbackService';
import { validateFeedback } from '../../utils/feedbackValidation';

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
      setSuccessMessage('Thank you for sharing your experience! Your dining feedback has been recorded.');
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

  const renderStars = (starCount) => (
    <div className="flex items-center gap-1 text-amber-400" aria-label={`${starCount} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-5 h-5 ${s <= starCount ? 'fill-current text-amber-400' : 'text-slate-600'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Guest Feedback & Ratings"
        subtitle="Help Cinnamon Bistro preserve its pinnacle of culinary craftsmanship by sharing your dining impressions."
      />

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-4 text-emerald-200 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-400 hover:text-emerald-200"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-8 rounded-lg bg-rose-950/40 border border-rose-500/40 p-4 text-rose-200 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} />
            </svg>
            <span className="font-medium text-sm">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-200"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Feedback Submission Form */}
        <section className="lg:col-span-7 bg-slate-900/90 border border-amber-900/30 rounded-xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-serif font-bold text-amber-100 mb-2 flex items-center gap-2">
            <span>Rate Your Experience</span>
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Select your rating and tell us about your food, ambience, and hospitality.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating Control */}
            <div>
              <label className="block text-sm font-semibold text-amber-200/90 mb-2">
                Overall Experience Rating <span className="text-rose-400">*</span>
              </label>
              <div
                className="flex items-center gap-2 mb-2"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const active = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      className="p-1 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded transition-transform hover:scale-110"
                      aria-label={`${starValue} star`}
                    >
                      <svg
                        className={`w-9 h-9 transition-colors ${
                          active ? 'fill-current text-amber-400' : 'text-slate-700 hover:text-amber-300'
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-amber-300/80 font-medium">
                {ratingDescriptions[hoverRating || rating]}
              </p>
              {fieldErrors.rating && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.rating}</p>
              )}
            </div>

            {/* Visit Association Option */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Associate with a Visit or Order (Optional)
              </label>
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="linkType"
                    value="none"
                    checked={linkType === 'none'}
                    onChange={() => setLinkType('none')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>General Visit</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="linkType"
                    value="reservation"
                    checked={linkType === 'reservation'}
                    onChange={() => setLinkType('reservation')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Table Reservation</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="linkType"
                    value="order"
                    checked={linkType === 'order'}
                    onChange={() => setLinkType('order')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Food Order</span>
                </label>
              </div>

              {linkType === 'reservation' && (
                <div className="mb-2">
                  <label htmlFor="resIdInput" className="block text-xs font-semibold text-slate-400 mb-1">
                    Reservation ID
                  </label>
                  <input
                    id="resIdInput"
                    type="number"
                    min="1"
                    placeholder="e.g. 102"
                    value={reservationId}
                    onChange={(e) => setReservationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Found in your Reservation History (e.g. Booking #102).</p>
                </div>
              )}

              {linkType === 'order' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label htmlFor="orderIdInput" className="block text-xs font-semibold text-slate-400 mb-1">
                      Order ID
                    </label>
                    <input
                      id="orderIdInput"
                      type="number"
                      min="1"
                      placeholder="e.g. 54"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="orderTypeSelect" className="block text-xs font-semibold text-slate-400 mb-1">
                      Order Type
                    </label>
                    <select
                      id="orderTypeSelect"
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="DineIn">Dine-In Order</option>
                      <option value="ReservationPreOrder">Pre-Order</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Section */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="commentInput" className="block text-sm font-semibold text-amber-200/90">
                  Your Comments {rating <= 3 && <span className="text-rose-400">*</span>}
                </label>
                <span className={`text-xs ${comment.length > 950 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {comment.length} / 1000
                </span>
              </div>
              <textarea
                id="commentInput"
                rows={4}
                maxLength={1000}
                placeholder={
                  rating <= 3
                    ? 'Please describe what could have been better about your visit (minimum 5 characters)...'
                    : 'Share details of your favorite dishes, our team hospitality, or dining atmosphere (optional)...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={`w-full bg-slate-800 border ${
                  fieldErrors.comment ? 'border-rose-500' : 'border-slate-700'
                } rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors`}
              />
              {fieldErrors.comment ? (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.comment}</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  {rating <= 3
                    ? 'A comment is required for ratings of 3 stars or lower to help us improve.'
                    : 'Comments are optional for 4 and 5-star ratings.'}
                </p>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-700 text-slate-950 font-bold rounded-lg transition-colors shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Submitting Feedback...</span>
                  </>
                ) : (
                  <span>Submit Dining Feedback</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Previous Feedback History */}
        <section className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-6 md:p-8 flex flex-col">
          <h2 className="text-xl font-serif font-bold text-slate-100 mb-2">Your Previous Reviews</h2>
          <p className="text-sm text-slate-400 mb-6">
            Review your historical feedback submissions recorded for Cinnamon Bistro.
          </p>

          {feedbackListLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading your reviews...</p>
            </div>
          ) : previousFeedbacks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center p-6 border border-dashed border-slate-800 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">No feedback submitted yet</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Your past reviews and dining ratings will appear here after submission.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {previousFeedbacks.map((fb) => (
                <div
                  key={fb.feedbackId}
                  className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    {renderStars(fb.rating)}
                    <span className="text-xs text-slate-400">
                      {new Date(fb.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {(fb.bookingReference || fb.orderReference) && (
                    <div className="mb-2">
                      <span className="inline-block bg-slate-700/80 text-amber-300 text-xs px-2 py-0.5 rounded font-mono">
                        {fb.bookingReference ? `Booking ${fb.bookingReference}` : fb.orderReference}
                      </span>
                    </div>
                  )}

                  {fb.comment ? (
                    <p className="text-sm text-slate-200 italic bg-slate-900/50 p-2.5 rounded border-l-2 border-amber-500/60">
                      "{fb.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No comment provided.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
