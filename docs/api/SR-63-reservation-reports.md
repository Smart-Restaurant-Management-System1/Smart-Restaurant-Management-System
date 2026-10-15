# SR-63: Reservation Reporting & Analytics

This document details the backend endpoints, metric definitions, and export behaviors implemented for **SR-63** and its subtasks (**SR-84**, **SR-85**, and **SR-86**).

## Authorization & Access Control

All reporting and export endpoints are restricted strictly to authenticated administrators using the project's existing JWT bearer authentication and role-based access control (`AppRoles.Admin`):

- Missing token: `401 Unauthorized`
- Authenticated non-admin user (e.g. Customer, KitchenStaff): `403 Forbidden`
- Authenticated administrator: `200 OK`

---

## Endpoints

### 1. Reservation Reports Aggregation (SR-84)

```http
GET /api/reports/reservations?from=2026-09-01&to=2026-09-30
```

#### Query Parameters:
- `from` (`DateOnly`, optional): Start date of the reporting window (inclusive, 00:00:00 UTC).
- `to` (`DateOnly`, optional): End date of the reporting window (inclusive, up to next day 00:00:00 UTC boundary).
- **Default Range**: If omitted, `to` defaults to UTC today and `from` defaults to 29 days prior (30-day window).
- **Validation**:
  - `from` cannot be later than `to` (`400 Bad Request`).
  - The date range cannot exceed 92 days (`400 Bad Request`).

#### Response DTO Structure:
```json
{
  "from": "2026-09-01",
  "to": "2026-09-30",
  "summary": {
    "totalReservations": 120,
    "confirmedReservations": 80,
    "pendingReservations": 15,
    "cancelledReservations": 10,
    "completedReservations": 15,
    "cancellationRate": 8.33,
    "averagePartySize": 3.42,
    "mostRequestedTableId": 2,
    "mostRequestedTableNumber": "T-02"
  },
  "bookingsPerDay": [
    {
      "date": "2026-09-01",
      "total": 4,
      "pending": 0,
      "confirmed": 3,
      "cancelled": 0,
      "completed": 1
    }
  ],
  "tableReservationShare": [
    {
      "tableId": 2,
      "tableNumber": "T-02",
      "capacity": 4,
      "reservationCount": 35,
      "nonCancelledReservationCount": 32,
      "tableReservationShare": 29.09
    }
  ]
}
```

---

### 2. Reservation Reports Export (SR-86)

```http
GET /api/reports/reservations/export?format=csv&from=2026-09-01&to=2026-09-30
GET /api/reports/reservations/export?format=xlsx&from=2026-09-01&to=2026-09-30
```

#### Query Parameters:
- `format`: `csv` or `xlsx` (case-insensitive, default `csv`).
- `from`, `to`: Same date parameters and validation rules as the JSON endpoint.

#### CSV Export Specifications:
- Content-Type: `text/csv; charset=utf-8` with UTF-8 BOM preamble.
- Header: `Content-Disposition: attachment; filename="reservation-report-{from}-to-{to}.csv"`
- Sections:
  1. **Summary**: Reporting period, totals by status, cancellation rate, average party size, most requested table.
  2. **Bookings Per Day**: Date, total, pending, confirmed, cancelled, completed.
  3. **Table Reservation Share**: Table number, capacity, total reservations, active reservations, reservation share %.
- **Formula Injection Mitigation**: Text cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized by prepending a single quote (`'`).

#### Excel (XLSX) Export Specifications:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Header: `Content-Disposition: attachment; filename="reservation-report-{from}-to-{to}.xlsx"`
- Generated using `ClosedXML 0.105.0`.
- Worksheets:
  1. `Summary`
  2. `Bookings Per Day`
  3. `Table Reservation Share`
- Formatted headers, frozen header rows, auto-fit columns, and proper decimal number formatting (`0.00`).

---

## Metric Formulas & Status Inclusion Rules

1. **Cancellation Rate**:
   $$\text{Cancellation Rate} = \begin{cases} 0.0 & \text{if } \text{TotalReservations} = 0 \\ \frac{\text{Cancelled}}{\text{Total}} \times 100 & \text{otherwise} \end{cases}$$
   Rounded to 2 decimal places.

2. **Table Reservation Share**:
   $$\text{Table Reservation Share} = \begin{cases} 0.0 & \text{if } \sum \text{ActiveCount} = 0 \\ \frac{\text{ActiveCount}}{\sum \text{ActiveCount}} \times 100 & \text{otherwise} \end{cases}$$
   Only active, non-cancelled bookings (`Pending`, `Confirmed`, `Completed`) are counted towards table share and top table calculations. `Cancelled` bookings are explicitly excluded.

3. **Date Boundary Handling**:
   ```sql
   WHERE StartDateTime >= @s AND StartDateTime < @e
   ```
   Where `@s` is `from` at `00:00:00` and `@e` is `to.AddDays(1)` at `00:00:00`.

---

## Frontend Dashboard (SR-85)

Located at route:
```text
/admin/reports/reservations
```
- Integrated into Admin dashboard navigation.
- Built with `recharts` for responsive SVG charting.
- Includes summary KPI cards, daily booking stacked bar charts, reservation status distribution pie charts, table share bar charts, accessible data tables, and blob-based authenticated exports for CSV and XLSX.
