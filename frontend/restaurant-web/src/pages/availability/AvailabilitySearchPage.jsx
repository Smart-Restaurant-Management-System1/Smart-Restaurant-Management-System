import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { searchAvailableTables } from '../../services/tableService';
import { calculatedEndTime, initialSearch, validateAvailabilitySearch } from './availabilitySearchView';
import PageHeader from '../../components/common/PageHeader';

const fieldLabel = {
  date: 'Visit date',
  startTime: 'Start time',
  durationMinutes: 'Duration (minutes)',
  guestCount: 'Guest count',
};

const FIELD_ICONS = {
  date: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  startTime: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  durationMinutes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="6" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15" y2="15" />
    </svg>
  ),
  guestCount: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

export default function AvailabilitySearchPage() {
  const location = useLocation();
  const [values, setValues] = useState(() => initialSearch(location.state?.search));
  const [fieldErrors, setFieldErrors] = useState({});
  const [results, setResults] = useState(null);
  const [state, setState] = useState('initial');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const change = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = validateAvailabilitySearch(values);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setState('initial');
      return;
    }
    setState('loading');
    setMessage('');
    setResults(null);
    setFieldErrors({});
    try {
      const response = await searchAvailableTables({
        ...values,
        durationMinutes: Number(values.durationMinutes),
        guestCount: Number(values.guestCount),
      });
      setResults(Array.isArray(response) ? response : []);
      setState(Array.isArray(response) && response.length ? 'results' : 'empty');
    } catch (error) {
      if (error.response?.status === 401) {
        setState('session');
        setMessage('Your session has expired. Please sign in again to search for tables.');
        return;
      }
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) {
        setFieldErrors(Object.fromEntries(Object.entries(serverErrors).map(([key, messages]) => [key, messages?.[0]])));
        setState('initial');
        return;
      }
      setState('error');
      setMessage('We couldn’t search for tables right now. Your search details have been preserved. Please try again.');
    }
  };

  const selectTable = (table) =>
    navigate('/reservations/new', {
      state: {
        search: {
          ...values,
          durationMinutes: Number(values.durationMinutes),
          guestCount: Number(values.guestCount),
          endTime: calculatedEndTime(values),
        },
        table,
      },
    });

  return (
    <div className="availability-page-content" style={{ maxWidth: '1180px', margin: '0 auto' }}>
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Dining Availability"
        title={<>Find an Available <em>Table</em></>}
        subtitle="Search live table availability for your planned visit date, time, and party size. Results are advisory until confirmed."
      />

      <form
        className="availability-form bistro-card"
        onSubmit={submit}
        noValidate
        aria-describedby="availability-help"
        style={{
          position: 'relative',
          background: '#ffffff',
          border: '1px solid #eedfc9',
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Top Gold Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
          }}
        />

        <p id="availability-help" style={{ color: '#78716c', fontSize: '0.84rem', margin: '0 0 1.25rem 0' }}>
          All times use the restaurant’s local time. Fields marked with an asterisk (<span aria-hidden="true" style={{ color: '#b91c1c' }}>*</span>) are required.
        </p>

        <div className="availability-fields">
          {Object.keys(fieldLabel).map((name) => (
            <label
              key={name}
              htmlFor={`availability-${name}`}
              style={{
                display: 'block',
                fontSize: '0.74rem',
                color: '#574e3f',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {fieldLabel[name]} <span aria-hidden="true" style={{ color: '#b91c1c' }}>*</span>
              <div className="input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '0.4rem' }}>
                <span style={{ position: 'absolute', left: '0.85rem', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  {FIELD_ICONS[name]}
                </span>
                <input
                  id={`availability-${name}`}
                  name={name}
                  required
                  value={values[name]}
                  onChange={change}
                  aria-invalid={Boolean(fieldErrors[name])}
                  aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
                  type={name === 'date' ? 'date' : name === 'startTime' ? 'time' : 'number'}
                  min={name === 'durationMinutes' ? '1' : name === 'guestCount' ? '1' : undefined}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0.45rem 0.75rem 0.45rem 2.35rem',
                    fontSize: '0.86rem',
                    color: '#282115',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d9d0bf',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {fieldErrors[name] && (
                <span id={`${name}-error`} className="field-error" role="alert" style={{ marginTop: '0.35rem' }}>
                  {fieldErrors[name]}
                </span>
              )}
            </label>
          ))}
        </div>

        <button
          className="bistro-button-gold"
          type="submit"
          disabled={state === 'loading'}
          style={{ marginTop: '1.25rem', padding: '0.65rem 1.75rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{state === 'loading' ? 'Searching Available Tables…' : 'Search Available Tables'}</span>
        </button>
      </form>

      {state === 'initial' && results === null && (
        <div
          className="availability-state"
          role="status"
          style={{
            background: '#ffffff',
            border: '1px dashed #d9d0bf',
            borderRadius: '12px',
            color: '#78716c',
            textAlign: 'center',
            padding: '2.75rem 1.5rem',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.75rem' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ margin: 0, fontSize: '0.92rem' }}>
            Enter your visit date, time, and guest count above to find available dining tables.
          </p>
        </div>
      )}

      {state === 'loading' && (
        <div
          className="availability-state"
          role="status"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            color: '#78716c',
            textAlign: 'center',
            padding: '2.75rem 1.5rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid rgba(197, 160, 89, 0.25)',
              borderTopColor: '#c5a059',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ margin: 0, fontSize: '0.92rem', fontStyle: 'italic' }}>
            Checking table availability in real time…
          </p>
        </div>
      )}

      {state === 'empty' && (
        <div
          className="availability-state"
          role="status"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            color: '#78716c',
            textAlign: 'center',
            padding: '3rem 1.5rem',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#faf5ec',
              border: '1px solid #eedfc9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#c5a059',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.2rem', color: '#282115', margin: '0 0 0.5rem' }}>
            No Tables Available for This Slot
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            No tables match your selected date, time, duration, and guest count. Try adjusting your visit time or party size.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</p>
          <button type="button" className="bistro-button-gold" onClick={() => submit({ preventDefault() {} })}>
            Try Again
          </button>
        </div>
      )}

      {state === 'session' && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</p>
          <Link className="bistro-button-gold" to="/login">
            Sign In
          </Link>
        </div>
      )}

      {state === 'results' && (
        <section className="availability-results" aria-label="Available tables" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {results.map((table) => (
            <article
              className="active-table-card bistro-card"
              key={table.tableId}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #eedfc9',
                borderRadius: '12px',
                padding: '1.5rem',
                overflow: 'hidden',
                boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              {/* Top Gold Accent Line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
                }}
              />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#faf5ec',
                        border: '1px solid #eedfc9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8c6736',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 18v3" />
                        <path d="M20 18v3" />
                        <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                        <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                      </svg>
                    </div>
                    <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.25rem', margin: 0, color: '#282115', fontWeight: 600 }}>
                      Table {table.tableNumber}
                    </h2>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#ecfdf5',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                    }}
                  >
                    <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
                    Available
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#faf6f0',
                      color: '#6b532f',
                      border: '1px solid #eedfc9',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {table.location || 'Main Dining Hall'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="bistro-button-gold"
                style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
                onClick={() => selectTable(table)}
              >
                Reserve This Table <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
