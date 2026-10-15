# SR-59 — Customer Reservation Detail, Edit and Cancellation

Implements SR-72 (owned detail), SR-74 (reschedule/update alias), SR-73 (cancellation) and SR-102 (repository operations).

---

## Authentication

All endpoints in this document require a valid signed JWT in the `Authorization: Bearer <token>` header.
The customer identifier is read exclusively from the `NameIdentifier` claim. No customer ID in a request body or query string is trusted.

---

## `GET /api/reservations/{id}/detail`

Returns a single reservation owned by the authenticated customer.

### Authorization

Role required: `Customer`.

To retrieve any reservation as an administrator use the existing `GET /api/reservations/{id}` (Admin role).

### Ownership policy (nondisclosure)

Both a missing reservation and a reservation that belongs to a different customer return `404 Not Found`. Existence is never disclosed to an unauthorized caller.

### Path parameters

| Name | Type | Description |
|------|------|-------------|
| `id` | `int` | Reservation ID. Must be ≥ 1. |

### Responses

| Status | Description |
|--------|-------------|
| `200 OK` | Reservation found and owned. Body: `CustomerReservationDetailDto`. |
| `400 Bad Request` | `id` is ≤ 0. Body: `ValidationProblemDetails`. |
| `401 Unauthorized` | No valid JWT present. |
| `404 Not Found` | Reservation does not exist, or belongs to another customer. |
| `500 Internal Server Error` | Unexpected database or service failure. Safe message only. |

### Response body — `CustomerReservationDetailDto`

```json
{
  "reservationId": 42,
  "bookingReference": "SR-A1B2C3",
  "tableId": 5,
  "tableNumber": "T-05",
  "startDateTime": "2031-06-15T14:30:00",
  "endDateTime":   "2031-06-15T16:00:00",
  "guestCount": 4,
  "status": "Pending",
  "canEdit": true,
  "canCancel": true,
  "createdAt": "2031-05-01T10:00:00Z",
  "updatedAt": "2031-05-01T10:00:00Z"
}
```

`canEdit` and `canCancel` are `true` only for upcoming `Pending` or `Confirmed` reservations (evaluated server-side).
`customerId` is intentionally absent.

---

## `PUT /api/reservations/{id}` and `PUT /api/reservations/{id}/schedule`

Atomically reschedule a reservation (change table, visit date/time, guest count).
Both routes call the same action. The `/schedule` suffix is the original SR-62 route preserved for existing consumers.

### Authorization

Role required: `Customer` or `Admin`.

- **Customer**: may update only their own upcoming `Pending` or `Confirmed` reservation.
- **Admin**: may update any non-terminal (`Pending` or `Confirmed`) reservation.

### Immutable fields

The following fields cannot be changed by this endpoint regardless of what the request body contains:

- Reservation ID
- Booking reference
- Customer owner
- Status
- Created timestamp
- Any audit field not listed as editable below

### Editable fields

```json
{
  "tableId": 5,
  "date": "2031-06-15",
  "startTime": "14:30",
  "durationMinutes": 90,
  "guestCount": 4
}
```

The request DTO (`RescheduleReservationRequestDto`) contains only these fields. Additional JSON properties are ignored by the deserializer and never reach the repository.

### Validation

| Rule | HTTP response |
|------|---------------|
| `tableId` null or ≤ 0 | `400` |
| `date` missing or in the past | `400` |
| `startTime` in the past (restaurant timezone) | `400` |
| `durationMinutes` ≤ 0 | `400` |
| `guestCount` < 1 | `400` |
| Duration outside configured min/max | `400` |
| Time outside restaurant operating hours | `400` |
| Table inactive | `409 INVALID_RESERVATION_STATE` → `404` (TableNotFound outcome) |
| Table capacity < guestCount | `409 INVALID_RESERVATION_STATE` → `Unavailable` |
| Overlap with existing Pending/Confirmed booking | `409 TABLE_NO_LONGER_AVAILABLE` |
| Customer does not own reservation | `404` (nondisclosure) |
| Reservation is `Cancelled` or `Completed` | `409 INVALID_RESERVATION_STATE` |
| Reservation start is in the past (customer) | `409 INVALID_RESERVATION_STATE` |

### SR-62 transaction

Every update uses one InnoDB connection and a `ReadCommitted` transaction:

1. Lock destination `RestaurantTables` row (`SELECT … FOR UPDATE`)
2. Verify `IsActive` and `Capacity ≥ guestCount`
3. Overlap check — half-open interval rule, excluding the current reservation ID
4. `UPDATE Reservations SET TableId, StartDateTime, EndDateTime, GuestCount, UpdatedAt`
5. Commit (or rollback on any failure)

The reservation being edited is excluded from the overlap check: `AND Id <> @ExcludedReservationId`. Back-to-back bookings are allowed.

Overlap condition: `existing.StartDateTime < requested.EndDateTime AND existing.EndDateTime > requested.StartDateTime`. Only `Pending` and `Confirmed` records block.

### Responses

| Status | Description |
|--------|-------------|
| `200 OK` | Update committed. Body: `ReservationConfirmationResponseDto` (current server state). |
| `400 Bad Request` | Validation failed. Body: `ValidationProblemDetails`. |
| `401 Unauthorized` | No valid JWT. |
| `403 Forbidden` | Authenticated but insufficient role. |
| `404 Not Found` | Reservation or table not found, or wrong customer. |
| `409 Conflict` | Overlap (`TABLE_NO_LONGER_AVAILABLE`) or invalid state (`INVALID_RESERVATION_STATE`). |

### Overlap conflict body

```json
{
  "code": "TABLE_NO_LONGER_AVAILABLE",
  "message": "The selected table is no longer available for this period. Please search again."
}
```

---

## `PATCH /api/reservations/{id}/cancel`  ·  `POST /api/reservations/{id}/cancel`

Cancels an eligible customer-owned reservation as a status change. Both routes call the same service operation. `POST` is the original SR-60 route preserved for existing consumers; `PATCH` is the SR-73 standard route.

### Authorization

Role required: `Customer`.

The customer ID is taken from the JWT `NameIdentifier` claim. Ownership is enforced in the repository by filtering `WHERE Id = @Id AND CustomerId = @CustomerId`.

### Cancellation rules

A customer may cancel only an upcoming `Pending` or `Confirmed` reservation (evaluated server-side by `ReservationMaintenancePolicy`).

| Reservation state | Outcome |
|-------------------|---------|
| Upcoming Pending or Confirmed | `200 OK` — status changed to `Cancelled` |
| Already Cancelled | `200 OK` — idempotent; row unchanged, existing `UpdatedAt` returned |
| Completed | `409 Conflict` |
| Past (start is in the past) | `409 Conflict` |
| Belongs to different customer | `404 Not Found` |
| Unknown ID | `404 Not Found` |

### Idempotency

An already-cancelled reservation is treated as a successful no-op. The second request commits without a second `UPDATE` and returns the existing committed state (same `UpdatedAt`). No duplicate audit entry or event is produced.

### Database guarantee

The operation uses an InnoDB row lock (`SELECT … FOR UPDATE`) then a conditional `UPDATE`. The row is **never deleted**. `BookingReference`, `CustomerId`, and `Id` are always preserved.

### Responses

| Status | Description |
|--------|-------------|
| `200 OK` | Cancelled (or already cancelled). Body: `CustomerReservationDetailDto` with `status: "Cancelled"`. |
| `400 Bad Request` | `id` ≤ 0. Body: `ValidationProblemDetails`. |
| `401 Unauthorized` | No valid JWT. |
| `404 Not Found` | Reservation not found or belongs to another customer. |
| `409 Conflict` | Reservation is Completed or past and cannot be cancelled. Body: `{ "code": "INVALID_RESERVATION_TRANSITION" }`. |

---

## Existing admin endpoint — `GET /api/reservations/{id}`

Unchanged. Requires `Admin` role. Returns `AdminReservationItemDto` including `customerId`. A customer calling this endpoint receives `403 Forbidden`.

---

## Status constants

| Value | Description |
|-------|-------------|
| `Pending` | Newly created, awaiting confirmation |
| `Confirmed` | Confirmed by staff |
| `Cancelled` | Cancelled by customer or admin (terminal) |
| `Completed` | Visit completed (terminal) |

Terminal states (`Cancelled`, `Completed`) cannot be edited or cancelled by customers.

---

## Notes

- All `DateTime` values in request/response bodies are restaurant-local wall-clock time (no offset or Z suffix). See `AvailabilityRulesOptions.TimeZoneId`.
- Audit timestamps (`createdAt`, `updatedAt`) are stored and returned as UTC.
- `canEdit` and `canCancel` in `CustomerReservationDetailDto` are advisory hints; the backend re-enforces all rules on every mutating request.
