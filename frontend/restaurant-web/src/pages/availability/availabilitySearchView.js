export const initialSearch = (saved = {}) => ({ date: '', startTime: '', durationMinutes: '90', guestCount: '2', ...saved });

export function validateAvailabilitySearch(values, now = new Date()) {
  const errors = {};
  if (!values.date) errors.date = 'Visit date is required.';
  if (!values.startTime) errors.startTime = 'Start time is required.';
  const duration = Number(values.durationMinutes);
  const guests = Number(values.guestCount);
  if (!values.durationMinutes || !Number.isInteger(duration) || duration <= 0) errors.durationMinutes = 'Duration must be greater than zero.';
  if (!values.guestCount || !Number.isInteger(guests) || guests < 1) errors.guestCount = 'Guest count must be at least 1.';
  if (values.date && values.startTime && !Number.isNaN(Date.parse(`${values.date}T${values.startTime}`))) {
    if (new Date(`${values.date}T${values.startTime}`) < now) errors.startTime = 'The requested start time must not be in the past.';
  }
  return errors;
}

export function calculatedEndTime({ date, startTime, durationMinutes }) {
  if (!date || !startTime || !durationMinutes) return '';
  const start = new Date(`${date}T${startTime}`);
  if (Number.isNaN(start.getTime())) return '';
  start.setMinutes(start.getMinutes() + Number(durationMinutes));
  return start.toTimeString().slice(0, 5);
}
