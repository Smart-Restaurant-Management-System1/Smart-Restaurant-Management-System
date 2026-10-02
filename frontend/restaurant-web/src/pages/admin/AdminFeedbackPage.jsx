import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getAdminFeedback, getAdminFeedbackSummary } from '../../services/feedbackService';

export default function AdminFeedbackPage() {
  const [feedbackData, setFeedbackData] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalFeedbacks: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await getAdminFeedbackSummary();
      setSummary(res || { averageRating: 0, totalFeedbacks: 0, ratingDistribution: {} });
    } catch {
      // non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchFeedbackList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: currentPage,
        pageSize,
        rating: ratingFilter ? parseInt(ratingFilter, 10) : undefined,
        fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate: toDate ? new Date(toDate + 'T23:59:59.999Z').toISOString() : undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await getAdminFeedback(params);
      setFeedbackData({
        items: res.items || [],
        totalCount: res.totalCount || 0,
        page: res.page || 1,
        pageSize: res.pageSize || 10,
        totalPages: res.totalPages || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer feedback list.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, ratingFilter, fromDate, toDate, searchTerm]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFeedbackList();
  }, [fetchFeedbackList]);

  const handleResetFilters = () => {
    setRatingFilter('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const renderStars = (starCount) => (
    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${starCount} stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= starCount ? 'fill-current text-amber-400' : 'text-slate-600'}`}
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
        title="Customer Feedback & Rating Management"
        subtitle="Review guest dining impressions, monitor satisfaction metrics, and track service quality across Cinnamon Bistro."
      />

      {/* Metrics / KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Average Rating */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Rating</span>
            <span className="text-amber-400 text-lg">★</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-amber-100">
              {summaryLoading ? '—' : summary.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <div className="mt-2">
            {renderStars(Math.round(summary.averageRating || 0))}
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Feedbacks</span>
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <span className="text-3xl font-serif font-bold text-slate-100">
            {summaryLoading ? '—' : summary.totalFeedbacks}
          </span>
          <p className="text-xs text-slate-400 mt-2">Verified customer reviews</p>
        </div>

        {/* 5-Star Satisfaction */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">5-Star Excellence</span>
            <span className="text-emerald-400 font-bold text-sm">
              {summary.totalFeedbacks > 0
                ? `${Math.round(((summary.ratingDistribution?.[5] || 0) / summary.totalFeedbacks) * 100)}%`
                : '0%'}
            </span>
          </div>
          <span className="text-3xl font-serif font-bold text-emerald-300">
            {summaryLoading ? '—' : summary.ratingDistribution?.[5] || 0}
          </span>
          <p className="text-xs text-slate-400 mt-2">Pinnacle dining scores</p>
        </div>

        {/* Attention Needed (1-2 Stars) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Feedback</span>
            <span className="text-rose-400 font-bold text-sm">
              {(summary.ratingDistribution?.[1] || 0) + (summary.ratingDistribution?.[2] || 0)}
            </span>
          </div>
          <span className="text-3xl font-serif font-bold text-rose-300">
            {summaryLoading ? '—' : (summary.ratingDistribution?.[1] || 0) + (summary.ratingDistribution?.[2] || 0)}
          </span>
          <p className="text-xs text-slate-400 mt-2">Ratings of 1 or 2 stars</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Rating filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Ratings (1 - 5)</option>
              <option value="5">5 Stars — Exceptional</option>
              <option value="4">4 Stars — Very Good</option>
              <option value="3">3 Stars — Average</option>
              <option value="2">2 Stars — Needs Work</option>
              <option value="1">1 Star — Critical</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Keyword / Booking Ref</label>
            <input
              type="text"
              placeholder="e.g. delicious or BK-123"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 rounded-lg bg-rose-950/40 border border-rose-500/40 p-4 text-rose-200 text-sm">
          {error}
        </div>
      )}

      {/* Feedback Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Customer</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 sm:px-6">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-2" />
                    <p className="text-xs">Loading feedback entries...</p>
                  </td>
                </tr>
              ) : feedbackData.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium text-slate-400 mb-1">No feedback records found</p>
                    <p className="text-xs">Try adjusting your filters or date range.</p>
                  </td>
                </tr>
              ) : (
                feedbackData.items.map((fb) => (
                  <tr key={fb.feedbackId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-mono text-xs text-amber-200/90 font-medium">
                      {fb.customerDisplayName || `Customer #${fb.customerId}`}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {renderStars(fb.rating)}
                        <span className="text-xs font-semibold text-slate-300">{fb.rating}.0</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {fb.bookingReference ? (
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-xs px-2 py-0.5 rounded font-mono">
                          {fb.bookingReference}
                        </span>
                      ) : fb.orderReference ? (
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2 py-0.5 rounded font-mono">
                          {fb.orderReference}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">General Visit</span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                      {new Date(fb.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      {fb.comment ? (
                        <p className="text-xs text-slate-200 max-w-md line-clamp-3">
                          "{fb.comment}"
                        </p>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No comment provided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="ml-2">
              Showing {feedbackData.totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, feedbackData.totalCount)} of {feedbackData.totalCount} reviews
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              Page {feedbackData.totalPages > 0 ? currentPage : 0} of {feedbackData.totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= feedbackData.totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(feedbackData.totalPages, p + 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
