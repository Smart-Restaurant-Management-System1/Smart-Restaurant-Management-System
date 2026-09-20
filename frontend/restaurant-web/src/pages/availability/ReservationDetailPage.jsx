import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cancelMyReservation, getActiveTables, getMyReservationDetail, rescheduleReservation } from '../../services/tableService';
import { editValues, updateRequest, validateEdit, maintenanceError, singleFlight } from './reservationMaintenance';
import PageHeader from '../../components/common/PageHeader';
import './reservationDetail.css';

export function ReservationDetails({ reservation }) {
  const isConfirmed = reservation.status === 'Confirmed';
  const isPending = reservation.status === 'Pending';

  return (
    <section
      aria-label="Server-confirmed reservation"
      className="reservation-history-card bistro-card"
      style={{
        position: 'relative',
        background: '#ffffff',
        border: '1px solid #eedfc9',
        borderRadius: '12px',
        padding: '1.75rem',
        boxShadow: '0 3px 14px rgba(40, 33, 21, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Top Gold Accent Strip */}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <span
            className="reservation-reference"
            style={{
              display: 'inline-block',
              color: '#8c6736',
              background: '#faf5ec',
              border: '1px solid #eedfc9',
              borderRadius: '6px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              fontFamily: 'monospace',
              marginBottom: '0.35rem',
              whiteSpace: 'nowrap',
              wordBreak: 'keep-all',
            }}
          >
            #{reservation.bookingReference}
          </span>
          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.35rem', margin: 0, color: '#282115', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Table {reservation.tableNumber}
          </h2>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.76rem',
            fontWeight: 600,
            background: isConfirmed ? '#ecfdf5' : isPending ? '#fffbeb' : '#f5efe6',
            color: isConfirmed ? '#15803d' : isPending ? '#b45309' : '#78716c',
            border: `1px solid ${isConfirmed ? '#bbf7d0' : isPending ? '#fde68a' : '#eedfc9'}`,
          }}
        >
          {(isConfirmed || isPending) && (
            <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px' }} />
          )}
          {reservation.status}
        </span>
      </div>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
          margin: 0,
        }}
      >
        <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
          <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
            Table Assignment
          </dt>
          <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Table {reservation.tableNumber}
          </dd>
        </div>

        <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
          <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
            Start Time
          </dt>
          <dd style={{ color: '#282115', fontSize: '0.92rem', fontWeight: 600, margin: 0 }}>
            {reservation.startDateTime.replace('T', ' ')}
          </dd>
        </div>

        <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
          <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
            End Time
          </dt>
          <dd style={{ color: '#282115', fontSize: '0.92rem', fontWeight: 600, margin: 0 }}>
            {reservation.endDateTime.replace('T', ' ')}
          </dd>
        </div>

        <div style={{ background: '#fcf9f5', border: '1px solid #eedfc9', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
          <dt style={{ color: '#78716c', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
            Party Size
          </dt>
          <dd style={{ color: '#282115', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default function ReservationDetailPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState(null);
  const [tables, setTables] = useState([]);
  const [tableError, setTableError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const alert = useRef(null);
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const mounted = useRef(false);
  const operation = useRef(singleFlight());
  const accept = (data) => { setReservation(data); setForm(editValues(data)); };
  const fail = (requestError) => {
    if (requestError?.response?.status === 401) {
      logout(); navigate('/login', { replace: true, state: { from: { pathname: '/reservations/' + reservationId } } });
      return;
    }
    setError(maintenanceError(requestError));
    setErrors(Object.fromEntries(Object.entries(requestError?.response?.data?.errors || {}).map(([key, value]) =>
      [key[0].toLowerCase() + key.slice(1), Array.isArray(value) ? value.join(' ') : String(value)])));
    setConflict(requestError?.response?.data?.code === 'TABLE_NO_LONGER_AVAILABLE');
  };
  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoading(true); setError(''); setReservation(null); setSuccess(''); setConflict(false);
    getMyReservationDetail(reservationId).then(data => { if (active) accept(data); })
      .catch(e => { if (active) fail(e); }).finally(() => { if (active) setLoading(false); });
    getActiveTables().then(data => { if (active) { setTables(data); setTableError(''); } })
      .catch(() => { if (active) setTableError('Table choices could not be loaded. Reload to try again.'); });
    return () => { active = false; mounted.current = false; };
  }, [reservationId, reload]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  const change = (event) => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const mutate = (cancel) => operation.current(async () => {
    setError(''); setErrors({}); setConflict(false); setSuccess('');
    if (!cancel) {
      const invalid = validateEdit(form);
      if (Object.keys(invalid).length) { setErrors(invalid); setError('Please correct the highlighted booking details.'); return; }
    }
    setBusy(true);
    try {
      const result = cancel ? await cancelMyReservation(reservationId)
        : await rescheduleReservation(reservationId, updateRequest(form));
      if (!mounted.current) return;
      // Show persisted response immediately. A failed refresh must not report a failed mutation.
      accept({ ...result, canEdit: false, canCancel: false });
      dialog.current?.close();
      setSuccess(cancel ? 'Reservation cancelled.' : 'Reservation updated.');
      try { const fresh = await getMyReservationDetail(reservationId); if (mounted.current) accept(fresh); }
      catch { if (mounted.current) setSuccess('Your change was saved, but refreshed details could not be loaded. Reload before making another change.'); }
    } catch (e) { if (mounted.current) { dialog.current?.close(); fail(e); } }
    finally { if (mounted.current) setBusy(false); }
  });
  const field = (name, label, type, extras = {}) => (
    <label style={{ fontSize: '0.76rem', color: '#574e3f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
      <input
        name={name}
        type={type}
        required
        value={form[name]}
        onChange={change}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? name + '-error' : undefined}
        style={{
          marginTop: '0.35rem',
          width: '100%',
          height: '38px',
          padding: '0.45rem 0.75rem',
          fontSize: '0.86rem',
          color: '#282115',
          backgroundColor: '#ffffff',
          border: '1px solid #d9d0bf',
          borderRadius: '6px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        {...extras}
      />
      {errors[name] && <span id={name + '-error'} className="field-error" style={{ marginTop: '0.35rem' }}>{errors[name]}</span>}
    </label>
  );

  return (
    <div className="reservation-detail-page-content" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <PageHeader
        eyebrow="Reservation Details"
        title={<>Manage Your <em>Reservation</em></>}
        subtitle={reservation ? `Booking reference ${reservation.bookingReference} for Table ${reservation.tableNumber}` : 'Inspect or reschedule your booked visit'}
        actions={
          <Link to="/reservations/history" className="bistro-button-outline">
            ← Back to History
          </Link>
        }
      />
    {loading && (
      <div
        className="bistro-card"
        style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          color: '#78716c',
          border: '1px solid #eedfc9',
          borderRadius: '12px',
          background: '#ffffff',
        }}
        role="status"
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
        Loading reservation details…
      </div>
    )}
    {error && (
      <div className="bistro-alert bistro-alert-error" role="alert" tabIndex="-1" ref={alert} style={{ flexDirection: 'column', alignItems: 'flex-start', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem' }}>
          <button type="button" className="bistro-button-gold" disabled={busy} onClick={() => setReload(x => x + 1)}>
            Reload Details
          </button>
          {conflict && (
            <Link className="bistro-button-outline" to="/availability" state={{ search: updateRequest(form) }}>
              Search Other Available Tables
            </Link>
          )}
        </div>
      </div>
    )}
    {success && (
      <div className="bistro-alert bistro-alert-success" role="status" style={{ borderRadius: '10px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{success}</span>
      </div>
    )}
    {reservation && <>
      <ReservationDetails reservation={reservation} />
      {!reservation.canEdit && !reservation.canCancel && (
        <p style={{ color: '#78716c', marginTop: '1.25rem', fontStyle: 'italic', fontSize: '0.88rem' }}>
          This booking is read-only. Only upcoming Pending or Confirmed bookings can be changed.
        </p>
      )}
      {reservation.canEdit && form && (
        <form
          className="availability-form bistro-card"
          onSubmit={e => { e.preventDefault(); mutate(false); }}
          style={{
            position: 'relative',
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            padding: '1.75rem',
            marginTop: '1.5rem',
            boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Top Gold Accent Strip */}
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

          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.35rem', marginBottom: '0.35rem', color: '#282115', fontWeight: 600 }}>
            Modify Your <em>Visit</em>
          </h2>
          <p style={{ color: '#78716c', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
            Times use the restaurant timezone. Table availability will be checked again upon saving.
          </p>

          <fieldset disabled={busy} style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ display: 'none' }}>Booking details</legend>
            <div className="availability-fields">
              <label style={{ fontSize: '0.76rem', color: '#574e3f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Table Choice
                <select
                  name="tableId"
                  value={form.tableId}
                  onChange={change}
                  required
                  aria-invalid={Boolean(errors.tableId)}
                  style={{
                    marginTop: '0.35rem',
                    width: '100%',
                    height: '38px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.86rem',
                    color: '#282115',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d9d0bf',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {!tables.some(t => String(t.tableId) === form.tableId) && <option value={form.tableId}>Current table {reservation.tableNumber}</option>}
                  {tables.map(t => <option key={t.tableId} value={t.tableId}>Table {t.tableNumber} — {t.seatingCapacity} seats ({t.location || 'Main Dining'})</option>)}
                </select>
                {errors.tableId && <span className="field-error" style={{ marginTop: '0.35rem' }}>{errors.tableId}</span>}
              </label>
              {field('date', 'Visit date', 'date')}
              {field('startTime', 'Start time', 'time')}
              {field('durationMinutes', 'Duration (minutes)', 'number', { min: 1, step: 1 })}
              {field('guestCount', 'Guests', 'number', { min: 1, step: 1 })}
            </div>
            {tableError && <p role="status" style={{ color: '#991b1b', marginTop: '0.5rem', fontSize: '0.88rem' }}>{tableError}</p>}
            <button className="bistro-button-gold" type="submit" style={{ marginTop: '1.25rem', padding: '0.65rem 1.5rem' }}>
              Save Reschedule Changes
            </button>
          </fieldset>
        </form>
      )}
      {reservation.canCancel && (
        <button
          ref={cancelButton}
          className="bistro-button-outline"
          type="button"
          disabled={busy}
          onClick={() => dialog.current.showModal()}
          style={{ marginTop: '1.25rem', color: '#991b1b', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>Cancel Reservation</span>
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="cancel-title"
        onCancel={e => { if (busy) e.preventDefault(); }}
        onClose={() => cancelButton.current?.focus()}
        style={{
          border: '1px solid #eedfc9',
          borderRadius: '14px',
          padding: '2rem',
          maxWidth: '440px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '1px solid rgba(220, 38, 38, 0.25)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 id="cancel-title" style={{ fontFamily: "Georgia, 'Times New Roman', serif", textAlign: 'center', marginBottom: '0.5rem', color: '#282115' }}>
          Cancel this reservation?
        </h2>
        <p style={{ textAlign: 'center', color: '#78716c', marginBottom: '1.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Your booking reference is <strong style={{ color: '#282115', letterSpacing: '0.04em' }}>{reservation.bookingReference}</strong>. This will release your reserved table back into open availability.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={() => dialog.current.close()}
            className="bistro-button-outline"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Keep Reservation
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => mutate(true)}
            className="bistro-button-danger"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {busy ? 'Cancelling…' : 'Confirm Cancellation'}
          </button>
        </div>
      </dialog>
    </>}
    {busy && (
      <div className="bistro-alert bistro-alert-info" role="status" style={{ marginTop: '1.25rem' }}>
        <svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Saving your change. Please do not submit again.</span>
      </div>
    )}
  </div>
  );
}
