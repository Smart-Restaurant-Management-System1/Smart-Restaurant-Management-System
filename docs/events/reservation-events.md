# Reservation Lifecycle Events (SR-101)

Reservation state changes are published to Apache Kafka so that downstream services
(reporting, notifications, analytics) can react without polling the reservation database.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Transactional Outbox Flow](#2-transactional-outbox-flow)
3. [Topic and Partitioning](#3-topic-and-partitioning)
4. [Delivery Guarantee and Consumer Idempotency](#4-delivery-guarantee-and-consumer-idempotency)
5. [Event Envelope — Common Fields](#5-event-envelope--common-fields)
6. [Event-Generation Matrix](#6-event-generation-matrix)
7. [Event Contracts (v1)](#7-event-contracts-v1)
   - [ReservationCreated](#71-reservationcreated)
   - [ReservationUpdated](#72-reservationupdated)
   - [ReservationCancelled](#73-reservationcancelled)
   - [ReservationStatusChanged](#74-reservationstatuschanged)
8. [UTC and Timezone Rules](#8-utc-and-timezone-rules)
9. [Schema Compatibility Rules](#9-schema-compatibility-rules)
10. [Outbox Schema](#10-outbox-schema)
11. [Publisher Leasing and Multi-Instance Safety](#11-publisher-leasing-and-multi-instance-safety)
12. [Retry, Backoff, and Dead-Letter Behaviour](#12-retry-backoff-and-dead-letter-behaviour)
13. [Broker-Failure Behaviour](#13-broker-failure-behaviour)
14. [Local Development Configuration](#14-local-development-configuration)
15. [Docker Commands](#15-docker-commands)
16. [CI Test Configuration](#16-ci-test-configuration)
17. [Migration Application and Rollback](#17-migration-application-and-rollback)
18. [Retention and Cleanup Recommendations](#18-retention-and-cleanup-recommendations)
19. [Operational Troubleshooting](#19-operational-troubleshooting)

---

## 1. Architecture Overview

```
 Reservation Service (ASP.NET Core)
 ┌──────────────────────────────────────────────────────────┐
 │  HTTP handler                                            │
 │    └─► ReservationRepository.CreateAtomicallyAsync()     │
 │            ├─ INSERT INTO Reservations          ┐        │
 │            └─ INSERT INTO ReservationOutbox     ┘ 1 TX   │
 │                                                          │
 │  OutboxPublisherService  (IHostedService, background)    │
 │    └─► poll ReservationOutbox (SKIP LOCKED lease)        │
 │            ├─ ProduceAsync → Kafka topic                 │
 │            └─ UPDATE outbox row → Processed             │
 └──────────────────────────────────────────────────────────┘
                             │
                     Kafka: restaurant.reservations.v1
                             │
              ┌──────────────┴────────────────┐
              ▼                               ▼
     Reporting Service                Notification Service
     (future)                         (future)
```

The reservation row and the outbox row are written in the **same InnoDB transaction**.
This guarantees that an event is never lost (no reservation without an outbox entry)
and no phantom event exists (no outbox entry without a committed reservation).

---

## 2. Transactional Outbox Flow

| Step | Actor | Detail |
|------|-------|--------|
| 1 | HTTP handler | Calls repository method (e.g. `CreateAtomicallyAsync`) |
| 2 | Repository | Opens `ReadCommitted` InnoDB transaction |
| 3 | Repository | Inserts/updates reservation row |
| 4 | Repository | Inserts `ReservationOutbox` row with `Status = Pending` |
| 5 | Repository | Commits — both writes visible atomically |
| 6 | Publisher | `ClaimBatchAsync` — `FOR UPDATE SKIP LOCKED`, sets `Status = Processing`, sets `LockId`, `LockedUntilUtc` |
| 7 | Publisher | Calls `Confluent.Kafka` `ProduceAsync` — waits for broker acknowledgement (`Acks.All`) |
| 8 | Publisher (success) | Calls `MarkProcessedAsync` — sets `Status = Processed`, `ProcessedAtUtc = now` |
| 8 | Publisher (failure) | Calls `RecordFailureAsync` — increments `AttemptCount`, sets `NextAttemptAtUtc`, records `LastError` |

The outbox row is kept in `Processed` state (not deleted) for audit and replay purposes.

---

## 3. Topic and Partitioning

| Property | Value |
|----------|-------|
| Topic name | `restaurant.reservations.v1` |
| Message key | Reservation ID as a decimal string (e.g. `"42"`) |
| Partitions | 4 (configured in Docker Compose / broker) |
| Retention | 7 days (168 hours) |

**Partition ordering**: because all events for a given reservation share the same message key,
Kafka routes them to the same partition, preserving per-reservation ordering.
Consumers that process events from multiple partitions will see cross-reservation
interleaving — this is normal and expected.

---

## 4. Delivery Guarantee and Consumer Idempotency

The outbox publisher uses **at-least-once delivery**:

- Kafka is acknowledged *before* the outbox row is marked `Processed`.
- If the service crashes between acknowledge and `MarkProcessed`, the row
  remains `Pending`/`Processing` and will be re-published after the lease expires.
- This means a consumer **may receive the same event more than once**.

**Consumers must deduplicate by `eventId`.**
The `eventId` field is a stable UUID stored in the outbox row and never regenerated
on retry. A consumer can use an idempotency table keyed on `eventId` to skip
already-processed events.

---

## 5. Event Envelope — Common Fields

Every event is a JSON object serialised with **camelCase property names**
(`System.Text.Json` with `JsonNamingPolicy.CamelCase`).

```json
{
  "eventId":          "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "eventType":        "ReservationCreated",
  "schemaVersion":    1,
  "occurredAtUtc":    "2025-09-12T08:30:00+00:00",
  "reservationId":    42,
  "bookingReference": "ABCD-1234",
  "payload":          { ... }
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `eventId` | UUID string | No | Stable identifier — reused on retry. Deduplicate on this. |
| `eventType` | string | No | One of the four event type constants below. |
| `schemaVersion` | integer | No | Always `1` for v1 contracts. |
| `occurredAtUtc` | ISO-8601 with `+00:00` | No | Wall-clock time the state change occurred. |
| `reservationId` | integer | No | Database primary key of the reservation. |
| `bookingReference` | string | No | Human-readable reference shown to customers. |
| `payload` | object | No | Event-type-specific fields (see below). |

---

## 6. Event-Generation Matrix

| Operation | Event emitted |
|-----------|---------------|
| Create reservation | `ReservationCreated` |
| Reschedule reservation (customer or admin) | `ReservationUpdated` |
| Customer cancels reservation | `ReservationCancelled` |
| Admin changes status → `Cancelled` | `ReservationCancelled` |
| Admin changes status → any other status | `ReservationStatusChanged` |
| Idempotent replay (same idempotency key) | *no event* |
| Conflict rollback | *no event* |

> **Note**: A cancellation emits only `ReservationCancelled`, never `ReservationStatusChanged`.
> Downstream consumers should not expect both for the same state transition.

---

## 7. Event Contracts (v1)

### 7.1 ReservationCreated

Emitted when a new reservation is successfully committed to the database.

```json
{
  "eventId":          "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "eventType":        "ReservationCreated",
  "schemaVersion":    1,
  "occurredAtUtc":    "2025-09-12T08:30:00+00:00",
  "reservationId":    42,
  "bookingReference": "ABCD-1234",
  "payload": {
    "tableId":        3,
    "tableNumber":    "T-03",
    "startDateTime":  "2025-09-20T18:00:00",
    "endDateTime":    "2025-09-20T19:30:00",
    "guestCount":     4,
    "initialStatus":  "Pending",
    "customerId":     7
  }
}
```

| Payload field | Type | Nullable | Description |
|---------------|------|----------|-------------|
| `tableId` | integer | No | Internal table ID. |
| `tableNumber` | string | No | Human-readable table label. |
| `startDateTime` | ISO-8601 local (no offset) | No | Restaurant wall-clock start time. |
| `endDateTime` | ISO-8601 local (no offset) | No | Restaurant wall-clock end time. |
| `guestCount` | integer | No | Number of guests. |
| `initialStatus` | string | No | Always `"Pending"` on creation. |
| `customerId` | integer | No | Internal customer ID. No PII. |

`startDateTime` and `endDateTime` are **local restaurant time** without a timezone offset.
They represent the slot as seen on the booking calendar.
The authoritative timezone is configured in `ReservationAvailability:TimeZoneId`.

### 7.2 ReservationUpdated

Emitted when a reservation is rescheduled (table, date, or duration changed).
Contains a **current snapshot** of the reservation, not just the delta.

```json
{
  "eventId":          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "eventType":        "ReservationUpdated",
  "schemaVersion":    1,
  "occurredAtUtc":    "2025-09-13T10:00:00+00:00",
  "reservationId":    42,
  "bookingReference": "ABCD-1234",
  "payload": {
    "tableId":        5,
    "tableNumber":    "T-05",
    "startDateTime":  "2025-09-21T19:00:00",
    "endDateTime":    "2025-09-21T20:30:00",
    "guestCount":     4,
    "status":         "Pending",
    "updatedAtUtc":   "2025-09-13T10:00:00+00:00"
  }
}
```

| Payload field | Type | Nullable | Description |
|---------------|------|----------|-------------|
| `tableId` | integer | No | Updated table ID. |
| `tableNumber` | string | No | Updated table number. |
| `startDateTime` | ISO-8601 local | No | New start time. |
| `endDateTime` | ISO-8601 local | No | New end time. |
| `guestCount` | integer | No | Guest count at time of update. |
| `status` | string | No | Reservation status at time of update. |
| `updatedAtUtc` | ISO-8601 with `+00:00` | No | Same as `occurredAtUtc`. |

### 7.3 ReservationCancelled

Emitted when a reservation reaches `Cancelled` status — either by the customer
directly or by an admin status transition.

```json
{
  "eventId":          "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  "eventType":        "ReservationCancelled",
  "schemaVersion":    1,
  "occurredAtUtc":    "2025-09-14T09:15:00+00:00",
  "reservationId":    42,
  "bookingReference": "ABCD-1234",
  "payload": {
    "cancellationStatus": "Cancelled",
    "cancelledAtUtc":     "2025-09-14T09:15:00+00:00",
    "customerId":         7
  }
}
```

| Payload field | Type | Nullable | Description |
|---------------|------|----------|-------------|
| `cancellationStatus` | string | No | Always `"Cancelled"`. |
| `cancelledAtUtc` | ISO-8601 with `+00:00` | No | Same as `occurredAtUtc`. |
| `customerId` | integer | No | Internal customer ID. No PII. |

### 7.4 ReservationStatusChanged

Emitted when an admin transitions a reservation to any status **other than** `Cancelled`
(e.g. `Pending` → `Confirmed`, `Confirmed` → `Completed`, `Confirmed` → `NoShow`).

```json
{
  "eventId":          "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  "eventType":        "ReservationStatusChanged",
  "schemaVersion":    1,
  "occurredAtUtc":    "2025-09-15T11:00:00+00:00",
  "reservationId":    42,
  "bookingReference": "ABCD-1234",
  "payload": {
    "previousStatus": "Pending",
    "currentStatus":  "Confirmed",
    "changedAtUtc":   "2025-09-15T11:00:00+00:00"
  }
}
```

| Payload field | Type | Nullable | Description |
|---------------|------|----------|-------------|
| `previousStatus` | string | No | Status before the transition. |
| `currentStatus` | string | No | Status after the transition. |
| `changedAtUtc` | ISO-8601 with `+00:00` | No | Same as `occurredAtUtc`. |

---

## 8. UTC and Timezone Rules

- All `*AtUtc` timestamp fields are `DateTimeOffset` serialised with explicit `+00:00` offset.
- `startDateTime` / `endDateTime` in the `Created` and `Updated` payloads are stored and
  transmitted as **local restaurant wall-clock time** without an offset, matching the value
  recorded in the database column.
- The authoritative restaurant timezone is `ReservationAvailability:TimeZoneId`
  (default: `"Asia/Colombo"`). Consumers that need UTC equivalents must apply this offset.
- The service never serialises `DateTime` values with `DateTimeKind.Unspecified` into
  UTC-designated fields — use `DateTimeOffset` with explicit `TimeSpan.Zero` offset instead.

---

## 9. Schema Compatibility Rules

The v1 contracts are **forward-compatible**: new optional fields may be added to any payload
without a version bump. A version bump (e.g. `schemaVersion: 2`) signals a breaking change.

Rules for adding fields:
- Add only nullable or optional fields.
- Never remove or rename existing fields in a published version.
- Never change the type of an existing field.
- Never change the meaning of an existing field.

Consumers should use lenient deserialisation (ignore unknown fields) to remain
compatible across minor additions.

---

## 10. Outbox Schema

The outbox table is created by `database/reservation-db/06_reservation_outbox.sql`.

```sql
CREATE TABLE ReservationOutbox (
    Id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EventId         CHAR(36)     NOT NULL,
    EventType       VARCHAR(64)  NOT NULL,
    SchemaVersion   TINYINT      NOT NULL DEFAULT 1,
    AggregateType   VARCHAR(32)  NOT NULL DEFAULT 'Reservation',
    AggregateId     INT          NOT NULL,
    MessageKey      VARCHAR(64)  NOT NULL,
    Payload         MEDIUMTEXT   NOT NULL,
    OccurredAtUtc   DATETIME(3)  NOT NULL,
    CreatedAtUtc    DATETIME(3)  NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    ProcessedAtUtc  DATETIME(3)  NULL,
    AttemptCount    SMALLINT     NOT NULL DEFAULT 0,
    NextAttemptAtUtc DATETIME(3) NULL,
    LastError       VARCHAR(512) NULL,
    Status          VARCHAR(16)  NOT NULL DEFAULT 'Pending',
    LockId          CHAR(36)     NULL,
    LockedUntilUtc  DATETIME(3)  NULL,

    CONSTRAINT chk_status CHECK (Status IN ('Pending','Processing','Processed','DeadLetter')),
    UNIQUE KEY uq_outbox_event_id (EventId)
);
```

Key indexes:

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_outbox_pending` | `(Status, NextAttemptAtUtc, OccurredAtUtc, Id)` | Publisher batch claim |
| `idx_outbox_processed_at` | `(ProcessedAtUtc)` | Cleanup / retention queries |

---

## 11. Publisher Leasing and Multi-Instance Safety

When multiple instances of the reservation service run concurrently (e.g. in Kubernetes),
all instances share the same MySQL database and compete to publish outbox rows.

The publisher uses a **lease protocol**:

1. Each `OutboxPublisherService` instance generates a unique `_instanceId` (Guid) on startup.
2. `ClaimBatchAsync` opens a short `ReadCommitted` transaction and runs:
   ```sql
   SELECT ... FROM ReservationOutbox
   WHERE Status = 'Pending'
     AND (NextAttemptAtUtc IS NULL OR NextAttemptAtUtc <= UTC_TIMESTAMP(3))
   LIMIT @batchSize
   FOR UPDATE SKIP LOCKED;
   ```
3. Claimed rows are immediately updated: `Status = 'Processing'`, `LockId = @instanceId`,
   `LockedUntilUtc = UTC_TIMESTAMP(3) + interval @leaseSeconds second`.
4. If an instance crashes mid-publish, its lease expires. The next `ClaimBatchAsync` call
   from any instance recovers expired rows (`LockedUntilUtc < now`, `Status = 'Processing'`)
   by resetting them to `Pending` before claiming a new batch.

This guarantees **exactly-once claiming** per batch cycle while tolerating instance failures.
At the Kafka level, delivery remains at-least-once (see Section 4).

---

## 12. Retry, Backoff, and Dead-Letter Behaviour

Failed publishes are retried with **bounded exponential backoff**:

```
delay = min(MaxRetryDelaySeconds, InitialRetryDelaySeconds × 2^(attemptCount - 1))
```

The exponent is capped at 30 to prevent integer overflow.

Default configuration:

| Setting | Default |
|---------|---------|
| `MaxAttempts` | 10 |
| `InitialRetryDelaySeconds` | 5 |
| `MaxRetryDelaySeconds` | 300 |
| `LeaseSeconds` | 60 |
| `BatchSize` | 50 |
| `PollIntervalSeconds` | 5 |

When `AttemptCount >= MaxAttempts`:
- `Status` is set to `DeadLetter`.
- `NextAttemptAtUtc` is set to `NULL` (the publisher will never re-claim this row automatically).
- `LastError` contains the final error message (truncated to 512 characters).

Dead-letter rows require manual intervention: inspect the `LastError`, fix the root cause
(e.g. topic misconfiguration, schema issue), then reset `Status = 'Pending'` and
`AttemptCount = 0` to allow re-processing.

---

## 13. Broker-Failure Behaviour

| Scenario | Outcome |
|----------|---------|
| Broker unavailable at publish time | `RecordFailureAsync` called; row retried after backoff. |
| `OperationCanceledException` (shutdown) | No failure recorded; lease expires; row reclaimed by next startup. |
| Service crashes between acknowledge and `MarkProcessed` | Row stays `Processing`; lease expires; re-published (duplicate delivery possible). |
| Kafka topic missing, `PublisherEnabled = false` | Publisher loop does not start; rows accumulate in `Pending` state. |

---

## 14. Local Development Configuration

`backend/reservation-service/appsettings.example.json` contains the full Kafka section.
Copy to `appsettings.Development.json` and fill in values:

```jsonc
{
  "Kafka": {
    "BootstrapServers":       "localhost:9092",
    "ReservationTopic":       "restaurant.reservations.v1",
    "ClientId":               "smart-restaurant-reservation-service",
    "SecurityProtocol":       "plaintext",
    "SaslMechanism":          "PLAIN",
    "SaslUsername":           "",
    "SaslPassword":           "",
    "PublisherEnabled":       true,
    "BatchSize":              50,
    "PollIntervalSeconds":    5,
    "MaxAttempts":            10,
    "InitialRetryDelaySeconds": 5,
    "MaxRetryDelaySeconds":   300,
    "LeaseSeconds":           60
  }
}
```

For production / cloud brokers (Confluent Cloud, MSK), set:
- `SecurityProtocol`: `"SASL_SSL"`
- `SaslMechanism`: `"PLAIN"`
- `SaslUsername` / `SaslPassword`: via environment variables, never committed to source control.

---

## 15. Docker Commands

Start the full stack (MySQL + Kafka + services + frontend):

```bash
# Copy and fill in environment variables
cp .env.example .env

# Build and start all containers
docker compose up --build

# Start only infrastructure (MySQL + Kafka) for local service development
docker compose up mysql kafka

# View Kafka publisher logs
docker compose logs -f reservation-service | grep -i kafka

# List topics
docker compose exec kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

# Consume events (latest)
docker compose exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic restaurant.reservations.v1 \
  --from-beginning

# Inspect dead-letter rows
docker compose exec mysql mysql -uroot -p$MYSQL_ROOT_PASSWORD \
  -e "SELECT Id, EventType, AttemptCount, LastError, Status FROM restaurant_reservation_db.ReservationOutbox WHERE Status = 'DeadLetter';"
```

---

## 16. CI Test Configuration

The CI pipeline (`.github/workflows/ci.yml`) has two test jobs:

### Unit tests (`tests` job)

Runs against `tests/unit/` — no real broker or database needed.
Covers event contracts (SR-113), publisher behaviour (SR-112), and backoff logic.

```bash
dotnet test tests/unit/reservation-service-tests/reservation-service-tests.csproj \
  --configuration Release
```

### Kafka integration tests (`kafka-integration` job)

Requires MySQL and Kafka service containers. Controlled by environment variables:

| Variable | Description |
|----------|-------------|
| `SR101_TEST_MYSQL` | Full MySQL connection string for the test database |
| `SR101_TEST_KAFKA` | Kafka bootstrap servers (e.g. `localhost:9092`) |

When `SR101_TEST_MYSQL` is not set, all tests in `OutboxTransactionIntegrationTests`
are skipped automatically (no failure). The Kafka end-to-end test (`RealKafka_*`)
additionally requires `SR101_TEST_KAFKA`.

To run integration tests locally (requires Docker):

```bash
# Start infrastructure
docker compose up mysql kafka -d

# Apply outbox migration (if not applied by Docker init)
mysql -h 127.0.0.1 -P 3306 -u root -p < database/reservation-db/06_reservation_outbox.sql

# Run with real MySQL and Kafka
SR101_TEST_MYSQL="Server=127.0.0.1;Port=3306;Database=restaurant_reservation_db;User=root;Password=<pwd>;AllowPublicKeyRetrieval=True;SslMode=None;" \
SR101_TEST_KAFKA="localhost:9092" \
dotnet test tests/integration/reservation-service-tests/reservation-service-integration-tests.csproj \
  --configuration Release
```

---

## 17. Migration Application and Rollback

Outbox migration file: `database/reservation-db/06_reservation_outbox.sql`

The migration is wrapped in an idempotent stored procedure (`ApplyReservationOutbox`)
that checks whether the table already exists before creating it.
Running the script multiple times is safe.

**Apply manually:**
```bash
mysql -h 127.0.0.1 -P 3306 -u root -p restaurant_reservation_db \
  < database/reservation-db/06_reservation_outbox.sql
```

**Rollback (destructive — loses all outbox history):**
```sql
DROP TABLE IF EXISTS ReservationOutbox;
```

Before rolling back in production, ensure all `Pending` and `Processing` rows have
been published or otherwise handled. `Processed` rows may be deleted safely.

**Docker Compose**: the file is mounted as `07_reservation_outbox.sql` in the MySQL
init directory and executed automatically on first container creation.

---

## 18. Retention and Cleanup Recommendations

`Processed` rows accumulate over time. The `idx_outbox_processed_at` index supports
efficient purge queries.

Recommended periodic cleanup (run as a scheduled job or stored procedure):

```sql
-- Delete processed rows older than 30 days
DELETE FROM ReservationOutbox
WHERE Status = 'Processed'
  AND ProcessedAtUtc < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
LIMIT 5000;
```

Run in batches (`LIMIT`) to avoid long-running transactions.

Kafka topic retention is configured to **7 days** (`log.retention.hours = 168`).
Adjust in `docker-compose.yml` (`KAFKA_CFG_LOG_RETENTION_HOURS`) or broker config
for longer replay windows.

---

## 19. Operational Troubleshooting

### Events not appearing in Kafka

1. Check `PublisherEnabled = true` in `appsettings.json` / environment.
2. Check service logs for Kafka connection errors.
3. Query for stuck rows:
   ```sql
   SELECT Id, EventType, Status, AttemptCount, LastError, LockedUntilUtc
   FROM ReservationOutbox
   WHERE Status IN ('Pending','Processing')
   ORDER BY OccurredAtUtc
   LIMIT 20;
   ```
4. If `LockedUntilUtc` is in the past and `Status = 'Processing'`, the publisher
   instance that held the lease has died. The lease will be recovered automatically
   on the next poll cycle.

### Dead-letter rows

```sql
SELECT * FROM ReservationOutbox WHERE Status = 'DeadLetter';
```

To re-queue after fixing the root cause:
```sql
UPDATE ReservationOutbox
SET Status = 'Pending', AttemptCount = 0, NextAttemptAtUtc = NULL
WHERE Status = 'DeadLetter' AND Id = <id>;
```

### Duplicate events consumed

This is expected behaviour (at-least-once delivery). Ensure your consumer deduplicates
on `eventId`. See [Section 4](#4-delivery-guarantee-and-consumer-idempotency).

### Kafka topic does not exist

With `KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE = true` (the default in Docker Compose),
the topic is created automatically on first produce. In production environments where
auto-creation is disabled, create the topic manually:

```bash
kafka-topics.sh --bootstrap-server <broker>:9092 \
  --create --topic restaurant.reservations.v1 \
  --partitions 4 --replication-factor 1
```

### Schema mismatch

All consumers must handle unknown JSON fields gracefully (ignore them).
If a consumer breaks on a field change, check `schemaVersion` — a version bump
signals a breaking contract change requiring consumer updates.
