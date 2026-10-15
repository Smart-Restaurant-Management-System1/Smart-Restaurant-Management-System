# SR-58 — Create a reservation

`POST /api/reservations` creates a customer-owned reservation after the SR-62 transaction rechecks availability. Only authenticated users with the `Customer` role may call it.

```json
{
  "tableId": 12,
  "date": "2026-09-20",
  "startTime": "19:00",
  "durationMinutes": 90,
  "guestCount": 4
}
```

The request never accepts customer ID, status, booking reference, table capacity, or timestamps. The service reads `ClaimTypes.NameIdentifier` from the validated JWT as `CustomerId`.

Send an `Idempotency-Key` header (up to 64 characters) for each deliberate booking attempt. Retrying the same request with that key returns the committed confirmation instead of creating another reservation.

## Successful response

`201 Created` is returned only after commit. It contains server-confirmed fields:

```json
{
  "reservationId": 845,
  "bookingReference": "SR-7K9M-4Q2X",
  "tableId": 12,
  "tableNumber": "T-12",
  "startDateTime": "2026-09-20T19:00:00",
  "endDateTime": "2026-09-20T20:30:00",
  "guestCount": 4,
  "status": "Pending",
  "createdAt": "2026-09-11T10:30:00Z"
}
```

Initial status is `Pending`. References use cryptographically random `SR-XXXX-XXXX` format and are database-unique; they are not authorization credentials.

## SR-62 transaction and conflicts

The repository opens one MySQL transaction, locks the selected `RestaurantTables` row with `SELECT ... FOR UPDATE`, then validates activity/capacity, checks strict half-open overlap, inserts, and commits. This serialises creations for the same physical table. `Pending` and `Confirmed` overlap; `Cancelled` does not. A stale table, insufficient capacity, inactive table, or blocking overlap returns `409` with `TABLE_NO_LONGER_AVAILABLE`; a missing table returns `404`.

The local date/time, operating-hours, duration, and overlap rules are the same as SR-57. Invalid input returns field-level `400` validation details; missing/invalid JWT returns `401`; non-customer roles return `403`; database errors return a safe `500` message.

## Migration

Apply `database/reservation-db/03_reservation_creation.sql` after the SR-57 migration. It is repeatable on MySQL 8. If a pre-SR-58 Reservations table contains rows without ownership data, it intentionally stops instead of assigning incorrect ownership. The safe rollback procedure is restoring a backup only after confirming no SR-58 reservation data exists; do not drop reservation data from a shared database.

## Frontend

SR-57 selection navigates to `/reservations/new` for explicit review. The confirmation page renders only the successful server response and intentionally shows no confirmation on refresh/direct navigation. A `409` returns to `/availability` with safe search values preserved.
