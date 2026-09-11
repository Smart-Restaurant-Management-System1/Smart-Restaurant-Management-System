# SR-60 — Reservation lifecycle and customer history

## Lifecycle

The only persisted reservation states are `Pending`, `Confirmed`, `Cancelled`, and `Completed`.

| Current | Allowed next state |
| --- | --- |
| Pending | Confirmed, Cancelled |
| Confirmed | Cancelled, Completed |
| Cancelled | none (terminal) |
| Completed | none (terminal) |

All status changes are checked in `ReservationStatusTransitionPolicy` before a parameterized `UPDATE` that includes the expected current status. A concurrent change therefore returns a conflict instead of overwriting a newer status. Every successful update sets `UpdatedAt`.

## `GET /api/reservations/my-history`

Requires a Customer JWT. The customer ID is read exclusively from the `NameIdentifier` claim; there is no customer-ID query parameter.

Query parameters:

- `page`: 1 or greater; defaults to `1`.
- `pageSize`: 1–50; defaults to `10`.

The response is ordered by `StartDateTime DESC, Id DESC` and has `items`, `page`, `pageSize`, `totalCount`, and `totalPages`. Every item contains only the reservation ID, booking reference, table ID/number, visit period, guest count, server-provided status, and audit timestamps.

An empty history is `200 OK` with `items: []`. Invalid pagination is `400`. A customer cannot retrieve another customer's bookings because the SQL predicate always filters on the JWT-derived `CustomerId`.

## Status actions

- `POST /api/reservations/{reservationId}/cancel` requires a Customer JWT and scopes the lookup/update to that customer.
- `PATCH /api/reservations/{reservationId}/status` requires an Admin JWT and accepts `{ "status": "Confirmed" }` (or another documented state).

Invalid, terminal, or concurrent transitions return `409` with `INVALID_RESERVATION_TRANSITION`; no record is changed.
