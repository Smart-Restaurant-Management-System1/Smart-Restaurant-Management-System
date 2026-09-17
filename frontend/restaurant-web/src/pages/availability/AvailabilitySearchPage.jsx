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
    <div className="availability-page-content">
      {/* Unified Page Header */}
      <PageHeader
        eyebrow="Dining Availability"
        title={<>Find an Available <em>Table</em></>}
        subtitle="Search live table availability for your planned visit date, time, and party size. Results are advisory until confirmed."
      />

      <form className="availability-form" onSubmit={submit} noValidate aria-describedby="availability-help" style={{ marginBottom: '2rem' }}>
        <p id="availability-help" style={{ color: 'var(--bistro-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          All times use the restaurant’s local time. Fields marked with an asterisk (<span aria-hidden="true" style={{ color: '#b91c1c' }}>*</span>) are required.
        </p>
        <div className="availability-fields">
          {Object.keys(fieldLabel).map((name) => (
            <label key={name} htmlFor={`availability-${name}`} style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>
              {fieldLabel[name]} <span aria-hidden="true" style={{ color: '#b91c1c' }}>*</span>
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
                style={{ marginTop: '0.35rem' }}
              />
              {fieldErrors[name] && (
                <span id={`${name}-error`} className="field-error" role="alert" style={{ marginTop: '0.35rem' }}>
                  {fieldErrors[name]}
                </span>
              )}
            </label>
          ))}
        </div>
        <button className="bistro-button-gold" type="submit" disabled={state === 'loading'} style={{ marginTop: '0.5rem' }}>
          {state === 'loading' ? 'Searching…' : 'Search available tables'}
        </button>
      </form>

      {state === 'initial' && results === null && (
        <p className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem' }}>
          Enter your visit details to search for a suitable dining table.
        </p>
      )}
      {state === 'loading' && (
        <p className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem' }}>
          Searching for available tables…
        </p>
      )}
      {state === 'empty' && (
        <p className="availability-state" role="status" style={{ background: '#ffffff', border: '1px dashed #d9d0bf', borderRadius: '10px', color: 'var(--bistro-muted)', textAlign: 'center', padding: '2rem' }}>
          No tables match your selected date, time, duration, and guest count. Try adjusting your visit time or party size.
        </p>
      )}
      {state === 'error' && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{message}</p>
          <button type="button" className="bistro-button-gold" onClick={() => submit({ preventDefault() {} })}>
            Try again
          </button>
        </div>
      )}
      {state === 'session' && (
        <div className="availability-state active-tables-error" role="alert" style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{message}</p>
          <Link className="bistro-button-gold" to="/login">
            Sign in
          </Link>
        </div>
      )}
      {state === 'results' && (
        <section className="availability-results" aria-label="Available tables">
          {results.map((table) => (
            <article className="active-table-card bistro-card" key={table.tableId} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.35rem', margin: 0 }}>Table {table.tableNumber}</h2>
                  <span className="reservation-status-confirmed">Available</span>
                </div>
                <p className="active-table-capacity" style={{ color: 'var(--bistro-muted)', margin: '0 0 1.25rem 0', fontSize: '0.9rem' }}>
                  {table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'} · {table.location || 'Main Dining Hall'}
                </p>
              </div>
              <button type="button" className="bistro-button-gold" style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => selectTable(table)}>
                Select this table <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
