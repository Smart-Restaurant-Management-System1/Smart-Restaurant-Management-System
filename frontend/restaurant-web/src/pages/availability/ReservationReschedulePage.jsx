import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Compatibility entry point: detail/edit now reloads from the protected server route.
export default function ReservationReschedulePage() {
  const { state } = useLocation();
  const id = state?.reservation?.reservationId;
  return <Navigate replace to={id ? '/reservations/' + id : '/reservations/history'} />;
}
