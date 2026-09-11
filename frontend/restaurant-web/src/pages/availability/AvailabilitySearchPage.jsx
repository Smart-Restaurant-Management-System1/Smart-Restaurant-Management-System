import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchAvailableTables } from '../../services/tableService';
import { calculatedEndTime, initialSearch, validateAvailabilitySearch } from './availabilitySearchView';

const fieldLabel = { date: 'Visit date', startTime: 'Start time', durationMinutes: 'Duration (minutes)', guestCount: 'Guest count' };

export default function AvailabilitySearchPage() {
  const [values, setValues] = useState(initialSearch);
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
    if (Object.keys(clientErrors).length) { setFieldErrors(clientErrors); setState('initial'); return; }
    setState('loading'); setMessage(''); setResults(null); setFieldErrors({});
    try {
      const response = await searchAvailableTables({ ...values, durationMinutes: Number(values.durationMinutes), guestCount: Number(values.guestCount) });
      setResults(Array.isArray(response) ? response : []);
      setState(Array.isArray(response) && response.length ? 'results' : 'empty');
    } catch (error) {
      if (error.response?.status === 401) {
        setState('session'); setMessage('Your session has expired. Please sign in again to search for tables.'); return;
      }
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) { setFieldErrors(Object.fromEntries(Object.entries(serverErrors).map(([key, messages]) => [key, messages?.[0]]))); setState('initial'); return; }
      setState('error'); setMessage('We couldn’t search for tables right now. Your search details have been preserved. Please try again.');
    }
  };

  const selectTable = (table) => navigate('/reservations/new', { state: { search: { ...values, durationMinutes: Number(values.durationMinutes), guestCount: Number(values.guestCount), endTime: calculatedEndTime(values) }, table } });

  return <main className="availability-page"><div className="availability-content">
    <Link to="/portal" className="link-jelly-back">← Back to portal</Link>
    <header className="availability-header"><p className="active-tables-eyebrow">Reservation search</p><h1>Find your table</h1><p>Search live table availability for your planned visit. Results are advisory until a reservation is confirmed.</p></header>
    <form className="availability-form" onSubmit={submit} noValidate aria-describedby="availability-help">
      <p id="availability-help">All times use the restaurant’s local time. Fields marked required must be completed.</p>
      <div className="availability-fields">
        {Object.keys(fieldLabel).map((name) => <label key={name} htmlFor={`availability-${name}`}>{fieldLabel[name]} <span aria-hidden="true">*</span>
          <input id={`availability-${name}`} name={name} required value={values[name]} onChange={change} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
            type={name === 'date' ? 'date' : name === 'startTime' ? 'time' : 'number'} min={name === 'durationMinutes' ? '1' : name === 'guestCount' ? '1' : undefined} />
          {fieldErrors[name] && <span id={`${name}-error`} className="field-error" role="alert">{fieldErrors[name]}</span>}
        </label>)}
      </div>
      <button className="btn-jelly-primary" type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Searching…' : 'Search available tables'}</button>
    </form>
    {state === 'initial' && results === null && <p className="availability-state" role="status">Enter your visit details to search for a suitable table.</p>}
    {state === 'loading' && <p className="availability-state" role="status">Searching for available tables…</p>}
    {state === 'empty' && <p className="availability-state" role="status">No tables match your selected date, time, duration, and guest count. Try another time or party size.</p>}
    {state === 'error' && <div className="availability-state active-tables-error" role="alert"><p>{message}</p><button type="button" className="btn-jelly-primary" onClick={() => submit({ preventDefault() {} })}>Try again</button></div>}
    {state === 'session' && <div className="availability-state active-tables-error" role="alert"><p>{message}</p><Link className="btn-jelly-primary" to="/login">Sign in</Link></div>}
    {state === 'results' && <section className="availability-results" aria-label="Available tables">{results.map((table) => <article className="active-table-card" key={table.tableId}><h2>Table {table.tableNumber}</h2><p className="active-table-capacity">{table.seatingCapacity} {table.seatingCapacity === 1 ? 'seat' : 'seats'}</p><button type="button" className="btn-jelly-primary" onClick={() => selectTable(table)}>Select this table</button></article>)}</section>}
  </div></main>;
}
