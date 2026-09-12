export const BOOKING_CONFLICT_CODE = 'TABLE_NO_LONGER_AVAILABLE';
export const isBookingConflict = (error) => error?.response?.status === 409 && error?.response?.data?.code === BOOKING_CONFLICT_CODE;
export const bookingConflictMessage = 'This table was available when you selected it, but another customer completed a reservation first. Please search again for an available table.';
export const safeSearchCriteria = (search = {}) => ({ date: search.date, startTime: search.startTime, durationMinutes: search.durationMinutes, guestCount: search.guestCount });
