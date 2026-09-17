import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cancelMyReservation, getActiveTables, getMyReservationDetail, rescheduleReservation } from '../../services/tableService';
import { editValues, updateRequest, validateEdit, maintenanceError, singleFlight } from './reservationMaintenance';
import PageHeader from '../../components/common/PageHeader';
import './reservationDetail.css';

export function ReservationDetails({ reservation }) {
  return <section aria-label="Server-confirmed reservation" className="reservation-history-card">
    <h2>Booking {reservation.bookingReference}</h2>
    <dl><dt>Table</dt><dd>{reservation.tableNumber}</dd>
      <dt>Start (restaurant time)</dt><dd>{reservation.startDateTime.replace('T', ' ')}</dd>
      <dt>End (restaurant time)</dt><dd>{reservation.endDateTime.replace('T', ' ')}</dd>
      <dt>Guests</dt><dd>{reservation.guestCount}</dd><dt>Status</dt><dd>{reservation.status}</dd></dl>
  </section>;
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
  const field = (name, label, type, extras = {}) => <label>{label}<input name={name} type={type} required
    value={form[name]} onChange={change} aria-invalid={Boolean(errors[name])}
    aria-describedby={errors[name] ? name + '-error' : undefined} {...extras} />
    {errors[name] && <span id={name + '-error'}>{errors[name]}</span>}</label>;
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
    {loading && <div className="bistro-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--bistro-muted)' }} role="status">Loading reservation…</div>}
    {error && <div className="availability-state active-tables-error" role="alert" tabIndex="-1" ref={alert} style={{ background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#991b1b' }}><p style={{ margin: 0 }}>{error}</p>
      <button type="button" className="bistro-button-gold" disabled={busy} onClick={() => setReload(x => x + 1)} style={{ marginTop: '0.75rem' }}>Reload details</button>
      {conflict && <Link className="bistro-button-outline" to="/availability" state={{ search: updateRequest(form) }} style={{ marginLeft: '0.5rem' }}>Search other available tables</Link>}
    </div>}
    {success && <div style={{ background: '#edf7ee', border: '1px solid #c2e2c6', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#1e5e29' }} role="status">{success}</div>}
    {reservation && <><ReservationDetails reservation={reservation} />
      {!reservation.canEdit && !reservation.canCancel && <p style={{ color: 'var(--bistro-muted)', marginTop: '1rem' }}>This booking is read-only. Only upcoming Pending or Confirmed bookings can be changed.</p>}
      {reservation.canEdit && form && <form className="availability-form bistro-card" onSubmit={e => { e.preventDefault(); mutate(false); }} style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>Edit your <em>visit</em></h2>
        <p style={{ color: 'var(--bistro-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Times use the restaurant timezone. Availability is checked again when you save.</p>
        <fieldset disabled={busy} style={{ border: 'none', padding: 0, margin: 0 }}><legend style={{ display: 'none' }}>Booking details</legend><div className="availability-fields">
          <label style={{ fontSize: '0.88rem', color: 'var(--bistro-ink)', fontWeight: 600 }}>Table<select name="tableId" value={form.tableId} onChange={change} required aria-invalid={Boolean(errors.tableId)} style={{ marginTop: '0.35rem' }}>
            {!tables.some(t => String(t.tableId) === form.tableId) && <option value={form.tableId}>Current table {reservation.tableNumber}</option>}
            {tables.map(t => <option key={t.tableId} value={t.tableId}>Table {t.tableNumber} — {t.seatingCapacity} seats</option>)}
          </select>{errors.tableId && <span className="field-error">{errors.tableId}</span>}</label>
          {field('date', 'Visit date', 'date')}{field('startTime', 'Start time', 'time')}
          {field('durationMinutes', 'Duration (minutes)', 'number', { min: 1, step: 1 })}
          {field('guestCount', 'Guests', 'number', { min: 1, step: 1 })}
        </div>{tableError && <p role="status" style={{ color: '#991b1b', marginTop: '0.5rem' }}>{tableError}</p>}
          <button className="bistro-button-gold" type="submit" style={{ marginTop: '1rem' }}>Save changes</button>
        </fieldset>
      </form>}
      {reservation.canCancel && <button ref={cancelButton} className="bistro-button-outline" type="button" disabled={busy} onClick={() => dialog.current.showModal()} style={{ marginTop: '1rem', color: '#991b1b', borderColor: '#fca5a5' }}>Cancel reservation</button>}
      <dialog ref={dialog} aria-labelledby="cancel-title" onCancel={e => { if (busy) e.preventDefault(); }}
        onClose={() => cancelButton.current?.focus()}>
        <h2 id="cancel-title">Cancel this reservation?</h2><p>Your booking reference is {reservation.bookingReference}. This action releases your booking.</p>
        <button type="button" autoFocus disabled={busy} onClick={() => dialog.current.close()}>Keep reservation</button>
        <button type="button" disabled={busy} onClick={() => mutate(true)}>Confirm cancellation</button>
      </dialog>
    </>}
    {busy && <p role="status">Saving your change. Please do not submit again.</p>}
  </div>
  );
}
