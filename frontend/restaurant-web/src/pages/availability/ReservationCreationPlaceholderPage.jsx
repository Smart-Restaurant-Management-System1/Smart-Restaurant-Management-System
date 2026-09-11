import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function ReservationCreationPlaceholderPage() {
  const { state } = useLocation();
  const selection = state?.table && state?.search;
  return <main className="availability-page"><div className="availability-content"><Link to="/availability" className="link-jelly-back">← Back to search</Link>
    <h1>Reservation details</h1>
    {selection ? <div className="availability-state"><p><strong>Table {state.table.tableNumber}</strong> for {state.search.guestCount} guests at {state.search.startTime}–{state.search.endTime} on {state.search.date}.</p><p>Reservation creation is the next SR-58 step. Availability will be rechecked before a booking is confirmed.</p></div> : <div className="availability-state"><p>Please search for a table before continuing to reservation creation.</p><Link to="/availability">Search availability</Link></div>}
  </div></main>;
}
