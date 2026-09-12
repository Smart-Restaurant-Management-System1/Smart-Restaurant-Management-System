# SR-62 — Concurrent booking protection

Creation (`POST /api/reservations`) and rescheduling (`PUT /api/reservations/{reservationId}/schedule`) use the same parameterized, transaction-scoped overlap mechanism.

## Conflict contract

When a physical table is no longer free for the requested period, both routes return `409`:

```json
{ "code": "TABLE_NO_LONGER_AVAILABLE", "message": "The selected table is no longer available for this period. Please search again." }
```

Only `Pending` and `Confirmed` records block. The canonical half-open rule is:

```text
existing.StartDateTime < requested.EndDateTime
AND existing.EndDateTime > requested.StartDateTime
```

Back-to-back reservations are allowed. `Cancelled` and `Completed` records do not block.

## Transaction design (SR-81/SR-82)

The repository opens one MySQL/InnoDB connection and a `ReadCommitted` transaction. It locks the destination `RestaurantTables` row using `SELECT ... FOR UPDATE`, validates activity/capacity, executes the final overlap query through that same transaction, then inserts or updates and commits. Reschedules additionally lock the reservation row, verify ownership before lifecycle/availability information is acted on, and exclude their own ID from the overlap query.

The destination-table lock is always acquired first. It serialises conflicting operations for one physical table; `ReadCommitted` supplies normal statement visibility but is not itself the overlap guarantee. Every failure, cancellation, conflict, deadlock, or timeout rolls back. No automatic request retry is used; the booking-reference collision retry is bounded to three attempts within the already locked transaction.

`05_reservation_concurrency.sql` repeatably ensures `idx_reservations_table_status_period (TableId, Status, StartDateTime, EndDateTime)`. It narrows candidates for the overlap predicate but cannot enforce arbitrary interval non-overlap; the lock and final query enforce correctness. Use `EXPLAIN` with the final predicate to inspect its use on production-like data.

## Rescheduling authorization

Customers may reschedule only their own future `Pending` or `Confirmed` reservation. Admins may reschedule a reservation that is not `Cancelled` or `Completed`. Customer identity comes only from the validated JWT; request bodies contain no customer ID, booking reference, status, or ownership field.

## Local verification

Apply migrations in order `02` through `05` to a MySQL 8 reservation database. Use a local test schema with unique table/customer data for real concurrent HTTP tests. The unit suite validates all interval shapes and the stable conflict mapping; production/CI integration concurrency tests require a disposable MySQL service and must assert exactly one commit for competing requests.
