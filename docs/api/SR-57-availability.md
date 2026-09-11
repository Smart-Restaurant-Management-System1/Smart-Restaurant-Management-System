# SR-57 — Reservation availability search

`GET /api/reservations/availability` is an authenticated, advisory search. It does not create a reservation or lock a table. SR-58 must recheck availability in the same transaction used to create a reservation.

## Request

```text
GET /api/reservations/availability?date=2026-09-20&startTime=19:00&durationMinutes=90&guestCount=4
Authorization: Bearer <fresh-token>
```

| Query parameter | Format | Rule |
| --- | --- | --- |
| `date` | `YYYY-MM-DD` | Required restaurant-local visit date |
| `startTime` | `HH:mm` | Required restaurant-local start time |
| `durationMinutes` | positive integer | Required; must be within the configured limits |
| `guestCount` | positive integer | Required; must be at least one |

The initial configuration is in `ReservationAvailability` in `appsettings.example.json`: `Asia/Colombo`, opening `10:00`, closing `22:00`, and duration range 30–240 minutes. Deployments can override the section through normal ASP.NET configuration. Searches may not start in the past, cross midnight, or extend beyond opening hours.

## Response

`200 OK` returns an array, including an empty array when no table matches:

```json
[{ "tableId": 12, "tableNumber": "T-12", "seatingCapacity": 4 }]
```

`400 Bad Request` returns ASP.NET validation-problem details with field-level errors. Missing, invalid, expired, or malformed JWTs return `401 Unauthorized` under the existing bearer configuration.

## Availability rule

The query returns only active tables with capacity greater than or equal to `guestCount`. A table is excluded only when a `Pending` or `Confirmed` reservation overlaps the requested half-open period:

```text
requestedStart < existingEnd AND requestedEnd > existingStart
```

`Cancelled` reservations do not block a table. A booking ending exactly when another starts is therefore valid.

## Database setup

`database/reservation-db/02_reservations.sql` creates the `Reservations` table and the availability indexes for a fresh Compose database volume. Existing local databases must apply that script once, for example:

```powershell
Get-Content .\database\reservation-db\02_reservations.sql | docker exec -i smart_restaurant_mysql mysql -u root -p<your-password>
```

Do not put a real JWT or database password in documentation, source, or a pull request.

## Frontend and SR-58 boundary

Authenticated customers search at `/availability`. Selecting a result navigates to `/reservations/new` with selected-table and non-sensitive search context in navigation state. That placeholder intentionally does not create a reservation; a refresh returns the customer to search because SR-58 has not yet implemented durable reservation creation.
