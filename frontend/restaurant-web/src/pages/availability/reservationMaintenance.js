export function editValues(reservation) {
  return {
    tableId: String(reservation.tableId),
    date: reservation.startDateTime.slice(0, 10),
    startTime: reservation.startDateTime.slice(11, 16),
    durationMinutes: String(Math.round((Date.parse(reservation.endDateTime) - Date.parse(reservation.startDateTime)) / 60000)),
    guestCount: String(reservation.guestCount),
  };
}

// Explicit allowlist: never send customer ownership, reference, status or audit fields.
export function updateRequest(form) {
  return { tableId: Number(form.tableId), date: form.date, startTime: form.startTime,
    durationMinutes: Number(form.durationMinutes), guestCount: Number(form.guestCount) };
}

export function validateEdit(form) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '')) errors.date = 'Choose a date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime || '')) errors.startTime = 'Choose a valid time.';
  if (!Number.isInteger(Number(form.tableId)) || Number(form.tableId) < 1) errors.tableId = 'Choose a table.';
  if (!Number.isInteger(Number(form.guestCount)) || Number(form.guestCount) < 1) errors.guestCount = 'Enter a positive whole guest count.';
  if (!Number.isInteger(Number(form.durationMinutes)) || Number(form.durationMinutes) < 1) errors.durationMinutes = 'Enter a positive duration.';
  return errors;
}

export function maintenanceError(error) {
  const status = error?.response?.status;
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to manage this reservation.';
  if (status === 404) return 'Reservation not found.';
  if (status === 409) return error.response.data?.code === 'TABLE_NO_LONGER_AVAILABLE'
    ? 'That table is no longer available for this period. Your original booking has not changed.'
    : 'This reservation can no longer be changed. Reload its current details.';
  if (status === 400) return 'Please correct the highlighted booking details.';
  return 'The request could not be confirmed. Reload the reservation before retrying.';
}

// Synchronous guard also covers multiple clicks before React renders disabled controls.
export function singleFlight() {
  let running = false;
  return async (work) => {
    if (running) return;
    running = true;
    try { return await work(); } finally { running = false; }
  };
}
