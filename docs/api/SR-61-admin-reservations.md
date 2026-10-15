# SR-61 — Admin reservation management

All endpoints in this document require the `Admin` role. Customer, Kitchen Staff, and unauthenticated callers are rejected by ASP.NET authorization before reservation data is returned.

## `GET /api/reservations`

Returns a paginated operational reservation list. Optional query parameters are `visitFrom`, `visitTo`, `status`, `tableNumber`, `bookingReference`, `page` (default `1`), and `pageSize` (default `20`, maximum `100`).

Filters are combined with parameterized ADO.NET commands. Results are always ordered `StartDateTime DESC, Id DESC`, and return reservation/customer IDs, booking reference, table number, visit period, guest count, status, and timestamps. No authentication tokens, credentials, or profile data are returned.

## Details and lifecycle action

- `GET /api/reservations/{reservationId}` returns one operational reservation record.
- `PATCH /api/reservations/{reservationId}/status` accepts `{ "status": "Confirmed" }` and returns the updated record.

The shared SR-60 transition policy controls all status updates. Invalid, terminal, or concurrent state changes return `409`; missing reservations return `404`. Table and period changes are deliberately not exposed by this status endpoint—they must use the normal SR-58/SR-62 capacity and overlap-safe reservation workflow.
