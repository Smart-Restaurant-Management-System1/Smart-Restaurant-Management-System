# Cinnamon Bistro

**Smart Restaurant Table Reservation & Order Management System**

SE3022 Case Study Project — Year 3 Semester 1

## Overview

Cinnamon Bistro is an enterprise-grade smart restaurant management platform engineered across four sprints using a microservices architecture, a modern React web frontend, containerized infrastructure, and an event-driven messaging backbone.

- **Sprint 1 (Completed):** Established Identity & Access Management (JWT authentication, BCrypt hashing, role-based authorization for Customer, Admin, and KitchenStaff), customer profile management, core restaurant dining table configuration, multi-container Docker deployment, and CI/CD pipelines.
- **Sprint 2 (Completed):** Delivered complete end-to-end table reservation management, real-time availability search with local restaurant operating rules (`Asia/Colombo`), pessimistic row-level concurrency control (`SELECT ... FOR UPDATE`) preventing double-booking, customer reservation maintenance (rescheduling with self-exclusion and soft cancellation), administrative reservation management with controlled status transitions, analytics and reporting (with CSV/XLSX exports and spreadsheet formula injection defense), public landing experience, and asynchronous event publishing via the Transactional Outbox pattern and Apache Kafka (KRaft mode).
- **Sprint 3 (Upcoming Milestone):** Menu catalog management, customer table ordering, order status tracking, and kitchen display / queue management.
- **Sprint 4 (Planned Milestone):** Billing, payment processing, final end-to-end integration, performance hardening, and production cloud cutover.

---

## Sprint 2 — Table Reservation, Concurrency & Event-Driven Architecture

### Sprint 2 Goal

Deliver a resilient, production-ready table reservation workflow encompassing real-time availability search, concurrent double-booking protection under heavy load, customer self-service reservation lifecycle management, administrative operational oversight, analytics and reporting exports, and event publishing to Apache Kafka through the Transactional Outbox pattern.

### Sprint 2 Team Members

| Team member | Student ID | Sprint 2 role |
| --- | --- | --- |
| D.M.N. Pesanjith | IT24101505 | DevOps |
| H. L. P. S. Perera | IT24101848 | Developer |
| H.R.M.A.A. Bandara | IT24100315 | Business Analytics |
| Wijesinghe K. | IT24102587 | QA Engineer |

### Completed Features (Sprint 2)

| Story | Implemented behavior |
| --- | --- |
| **SR-13** — Active Restaurant Table Inventory View | Authenticated endpoint returning all operational tables (`IsActive = 1`) and seating capacities, powering the frontend table layout overview. |
| **SR-57** — Real-Time Availability Search | Dynamic search by date, start time, duration, and party size evaluating restaurant hours (`Asia/Colombo`) and non-blocking availability via the canonical half-open interval overlap algorithm. |
| **SR-58** — Atomic Reservation Creation & Idempotency | Transactional booking creation with cryptographic `SR-XXXX-XXXX` reference generation, JWT identity binding, and replay protection via client-supplied `Idempotency-Key` headers. |
| **SR-59** — Customer Reservation Maintenance (Detail, Reschedule & Soft Cancel) | Customer-safe reservation lookup enforcing an ID nondisclosure policy, atomic rescheduling with self-conflict exclusion, and idempotent soft cancellation preserving historical audit records. |
| **SR-60** — Reservation History & Lifecycle State Tracking | Paginated customer booking history sorted newest visit first (`StartDateTime DESC, Id DESC`) tracking the four controlled lifecycle states (`Pending`, `Confirmed`, `Completed`, `Cancelled`). |
| **SR-61** — Admin Reservation Dashboard & Status Transitions | Administrative dashboard supporting multi-criteria filtering (date range, status, table number, reference) and row-locked status transitions (`Pending` → `Confirmed`/`Cancelled`, `Confirmed` → `Completed`/`Cancelled`). |
| **SR-62** — Overlap Prevention & Pessimistic Concurrency Protection | Elimination of concurrent double-booking race conditions through InnoDB row-level locking (`SELECT ... FOR UPDATE` on `RestaurantTables`) and serialized interval conflict re-validation. |
| **SR-63** — Reservation Reporting, Analytics & Tabular Exports | Date-bounded analytics reporting with KPI summaries, zero-filled daily booking series, table utilization share (excluding cancellations), and CSV/XLSX file streaming with CSV formula injection mitigation. |
| **SR-101 / SR-114 / SR-115** — Transactional Outbox Pattern & Kafka Event Publishing | Atomic dual-write elimination writing domain changes and event envelopes into `ReservationOutbox` in one transaction, published to Kafka topic `restaurant.reservations.v1` via a background worker using `SKIP LOCKED`. |
| **SR-112** — Cinnamon Bistro Public Landing Page | Responsive public brand landing page featuring atmosphere toggle (daylight vs. twilight ambiance), culinary philosophy, operating schedule, and direct reservation entry points. |

#### 1. Active Table Inventory vs. Real-Time Availability (SR-13 & SR-57)
The system strictly distinguishes between physical inventory cataloging and temporal dining availability:
- **Active Table Catalog (SR-13):** `GET /api/tables/active` returns active restaurant tables (`IsActive = 1`) with their capacity and operational status (`Available`, `Occupied`, `Inactive`). This endpoint provides an inventory view for staff and customers, but does not calculate temporal scheduling.
- **Availability Search Algorithm (SR-57):** `GET /api/reservations/availability` performs dynamic advisory conflict evaluation. Requests are validated by `AvailabilitySearchValidator`:
  - Restaurant operating window: 10:00 to 22:00 (`Asia/Colombo` local timezone). Bookings cannot span past closing time or cross midnight.
  - Duration bounds: 30 minutes minimum to 240 minutes (4 hours) maximum.
  - Guest party bounds: 1 to 20 guests.
  - Temporal horizon: bookings cannot be placed in the past, and advance bookings are limited to 90 days.
  - **Half-Open Interval Overlap Rule:** A candidate table is available if and only if no conflicting reservation exists satisfying:
    $$\text{ExistingStart} < \text{RequestedEnd} \quad \land \quad \text{ExistingEnd} > \text{RequestedStart}$$
  - **Status Filtering:** Only reservations with status `Pending` or `Confirmed` block candidate tables. `Cancelled` reservations are explicitly non-blocking. `Completed` reservations represent concluded visits and do not block future intervals.
  - **Advisory Semantics:** Availability search does not acquire locks; row-level locks are strictly deferred to booking creation (SR-58/SR-62) to prevent denial-of-service starvation.

#### 2. Atomic Reservation Booking & Idempotency Guarantee (SR-58)
`POST /api/reservations` implements secure, durable booking creation:
- **Authentication & Authorization:** Restricted to `[Authorize(Roles = AppRoles.Customer)]`. The customer ID is read directly from the authenticated JWT `ClaimTypes.NameIdentifier` claim. Requests cannot supply or spoof a different customer ID.
- **Idempotency Protection:** Clients may pass an `Idempotency-Key` header (up to 64 characters). Under the table lock, the database is queried for an existing reservation matching `(CustomerId, IdempotencyKey)` via unique index `uq_reservations_customer_idempotency`. Replayed requests return HTTP 200 OK with the existing reservation, creating no duplicate records and emitting no redundant outbox events.
- **Booking Reference Generator:** Generates cryptographically secure, human-readable references in the format `SR-XXXX-XXXX` using an unambiguous uppercase alphanumeric character set (excluding confusing glyphs `0`, `O`, `1`, `I`). Uniqueness is guaranteed by unique index `uq_reservations_booking_reference` backed by an in-transaction retry loop.
- **Initial State:** All newly created reservations default strictly to `Pending` status.

#### 3. Concurrency Protection & Pessimistic Row Locking (SR-62)
To eliminate race conditions and double-booking when multiple concurrent requests attempt to reserve the same table for overlapping time slots:
- The transaction begins with `IsolationLevel.ReadCommitted`.
- The service acquires an exclusive row-level lock on the target table:
  ```sql
  SELECT TableNumber, Capacity, IsActive FROM RestaurantTables WHERE Id = @TableId FOR UPDATE;
  ```
- Any competing transaction attempting to book or reschedule into the same table is blocked at the database engine level until the holding transaction commits or rolls back.
- Under the protection of the exclusive table lock, the service verifies active status, verifies capacity (`Capacity >= GuestCount`), and re-executes the half-open interval overlap check against `Reservations`.
- If an overlapping reservation was committed by an earlier transaction, the second transaction safely detects the collision, rolls back, and returns HTTP 409 Conflict with error code `TABLE_NO_LONGER_AVAILABLE`.
- Performance is optimized via composite index `idx_reservations_table_status_period (TableId, Status, StartDateTime, EndDateTime)`.

#### 4. Customer Reservation Maintenance & Nondisclosure Policy (SR-59)
- **Nondisclosure Policy (`GET /api/reservations/{id}/detail`):** Returns a customer-safe DTO containing `CanEdit` and `CanCancel` permission flags. If a reservation ID does not exist, or if it belongs to another customer, the endpoint returns HTTP 404 Not Found. Existence is never revealed to unauthorized callers.
- **Atomic Rescheduling (`PUT /api/reservations/{id}`):** Allows customers (for their own reservations) or administrators to modify the table, date, start time, duration, or guest count. The operation acquires row locks on the destination table and the existing reservation row. Crucially, the overlap check applies **self-exclusion** (`Id <> @ExcludedReservationId`), allowing a reservation to adjust its own duration or time slot on the same table without conflicting with itself. Back-to-back reservations are supported under the half-open interval rule.
- **Soft Cancellation (`PATCH /api/reservations/{id}/cancel`):** Customers can cancel upcoming `Pending` or `Confirmed` reservations. The endpoint executes an atomic update setting status to `Cancelled` and updating `UpdatedAt`. Rows are never deleted, ensuring historical auditability. The endpoint is idempotent: cancelling an already-cancelled booking returns HTTP 200 OK with no side effects.

#### 5. Reservation Status Lifecycle & Customer History (SR-60)
Reservations follow a strictly controlled finite state machine enforced by database check constraint `chk_reservations_status`:
```text
           +-----------------------------+
           |                             |
           v                             |
       [Pending] --------> [Confirmed] --+-----> [Completed]
           |                     |
           v                     v
      [Cancelled]           [Cancelled]
```
- **Allowable Transitions:**
  - `Pending` → `Confirmed` (Admin confirmation)
  - `Pending` → `Cancelled` (Customer cancellation or Admin rejection)
  - `Confirmed` → `Completed` (Staff marks dining completed)
  - `Confirmed` → `Cancelled` (Customer cancellation or Admin cancellation)
  - Terminal states: `Cancelled` and `Completed` cannot transition to any other status.
- **Customer History (`GET /api/reservations/my-history`):** Returns paginated reservations scoped to the authenticated customer ID. Ordered by `StartDateTime DESC, Id DESC` (newest visit first), backed by composite index `idx_reservations_customer_visit (CustomerId, StartDateTime, Id)`.

#### 6. Administrative Dashboard & Management Operations (SR-61)
- **Admin Querying (`GET /api/reservations`):** Allows administrators to inspect and search all reservations across the restaurant. Supports composable query parameters:
  - `visitFrom` and `visitTo` (`DateOnly` range filters)
  - `status` (`Pending`, `Confirmed`, `Cancelled`, `Completed`)
  - `tableNumber` (case-insensitive substring filter)
  - `bookingReference` (case-insensitive substring filter)
  - `page` and `pageSize` (pagination up to 100 records per page)
- **Status Transitions (`PATCH /api/reservations/{id}/status`):** Validates the requested status transition against `ReservationStatusTransitionPolicy`. Under a `FOR UPDATE` lock, executes the update, records the audit timestamp, and emits a domain event through the outbox.

#### 7. Analytics, Reporting & Tabular Export Engine (SR-63)
- **Aggregated Metrics (`GET /api/reports/reservations`):** Generates an analytical report across a date range (default last 30 days, maximum 92 days):
  - KPI summary: Total reservations, counts by status (`Confirmed`, `Pending`, `Cancelled`, `Completed`), overall cancellation rate percentage, average party size, and most-requested table number.
  - Daily booking trend series: Full date sequence (zero-filled for days with no activity) showing total and per-status volumes.
  - Table reservation share: Active booking count and proportional share per dining table. To maintain demand accuracy, cancelled reservations are excluded from active table share calculations.
- **Spreadsheet Formula Injection Defense (`ToCsv`):** When generating CSV exports (`GET /api/reports/reservations/export?format=csv`), fields starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading apostrophe `'`. Output is encoded in UTF-8 with a Byte Order Mark (BOM) for seamless Microsoft Excel compatibility.
- **ClosedXML Excel Workbook Export (`ToXlsx`):** Generates a multi-tab formatted spreadsheet (`Summary`, `Bookings Per Day`, `Table Reservation Share`) featuring styled headers, bold summary metrics, and autofitted columns.

#### 8. Event-Driven Architecture: Transactional Outbox & Apache Kafka (SR-101, SR-114, SR-115)
To guarantee data consistency between the relational database and external distributed systems without dual-write hazards:
- **In-Transaction Outbox Write:** Every reservation mutation (`Create`, `Reschedule`, `Cancel`, `ChangeStatus`) writes to both the `Reservations` table and the `ReservationOutbox` table within the same MySQL InnoDB transaction (`IsolationLevel.ReadCommitted`). Both operations commit or roll back together atomically.
- **Deterministic Kafka Partitioning:** Events are keyed by `Reservation.Id` (as a string). This guarantees that all lifecycle events for a specific reservation aggregate are routed to the same Kafka partition, preserving strict chronological ordering.
- **Outbox Publisher Background Service (`OutboxPublisherService`):** A hosted .NET worker continuously polls `ReservationOutbox` using non-blocking row claims:
  ```sql
  SELECT Id FROM ReservationOutbox
  WHERE Status = 'Pending' AND (NextAttemptAtUtc IS NULL OR NextAttemptAtUtc <= @Now)
  ORDER BY OccurredAtUtc ASC, Id ASC
  LIMIT @BatchSize
  FOR UPDATE SKIP LOCKED;
  ```
- **Distributed Lease Coordination:** Claims assign a unique publisher `LockId` and lease expiration timestamp (`LockedUntilUtc`), permitting multiple publisher replicas to run safely without duplicate event publishing. Expired leases from crashed instances are automatically reclaimed.
- **At-Least-Once Delivery & Deduplication:** Events are published to Kafka topic `restaurant.reservations.v1`. The database record is transitioned to `Processed` only after broker delivery acknowledgement. Each event envelope carries a persistent UUID (`EventId`), enabling downstream consumers to implement idempotent message handling.
- **Fault Tolerance & Poison Pill Isolation:** Transient Kafka delivery failures increment `AttemptCount` and schedule retries using exponential backoff. Non-transient poison records transition to `DeadLetter` status after maximum attempts, preventing pipeline stalls.

#### 9. Public Landing Experience (SR-112)
- Public-facing entry point (`LandingPage.jsx`) accessible to guests without authentication.
- Interactive ambiance toggle allowing users to preview Cinnamon Bistro in "Daylight Dining" and "Twilight Ambiance" themes.
- Outlines culinary philosophy, signature dining experiences, operating hours, and location.
- Direct booking CTA buttons guiding guests directly into the availability search flow (`/availability`).

---

### API Endpoints Added in Sprint 2

| Method | Endpoint | Authorization | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tables/active` | Authenticated (Any Role) | Retrieves all active dining tables (`IsActive = 1`) and seating capacities (SR-13). |
| `GET` | `/api/reservations/availability` | Authenticated (Any Role) | Dynamic availability search evaluating hours, capacity, and interval overlap (SR-57). |
| `POST` | `/api/reservations` | Customer | Creates a new reservation atomically under table row lock with idempotency check (SR-58, SR-62). |
| `GET` | `/api/reservations/{id}/detail` | Customer | Retrieves reservation details for the authenticated customer with nondisclosure protection (SR-59). |
| `PUT` | `/api/reservations/{id}` | Customer, Admin | Reschedules table, date, time, duration, or party size with self-exclusion overlap check (SR-59, SR-62). |
| `PATCH` | `/api/reservations/{id}/cancel` | Customer | Soft-cancels an upcoming reservation idempotently without deleting historical data (SR-59). |
| `GET` | `/api/reservations/my-history` | Customer | Retrieves paginated booking history for the authenticated customer (SR-60). |
| `GET` | `/api/reservations` | Admin | Multi-criteria search and listing of all restaurant reservations with pagination (SR-61). |
| `GET` | `/api/reservations/{id}` | Admin | Retrieves complete reservation record including customer identification (SR-61). |
| `PATCH` | `/api/reservations/{id}/status` | Admin | Executes controlled status transitions (`Confirmed`, `Completed`, `Cancelled`) under row lock (SR-61). |
| `GET` | `/api/reports/reservations` | Admin | Generates aggregated analytics, daily trend series, and table utilization metrics (SR-63). |
| `GET` | `/api/reports/reservations/export` | Admin | Streams tabular report export in CSV (formula-injection escaped) or XLSX format (SR-63). |

---

### Database Schema & Migrations (Sprint 2)

Database evolution is managed via idempotent SQL migration scripts in `database/reservation-db/`:

| Migration Script | Scope & Changes Implemented |
| --- | --- |
| `02_reservations.sql` | Creates base `Reservations` table (`Id`, `TableId`, `StartDateTime`, `EndDateTime`, `Status`, `CreatedAt`, `UpdatedAt`), foreign key `fk_reservations_table`, check constraint `chk_reservations_period`, and index `idx_reservations_table_status_period`. |
| `03_reservation_creation.sql` | Adds `CustomerId`, `BookingReference`, `GuestCount`, `IdempotencyKey`, constraints `chk_reservations_guests` and `chk_reservations_status`, unique index `uq_reservations_booking_reference`, unique index `uq_reservations_customer_idempotency`, and index `idx_reservations_customer_created`. |
| `04_reservation_lifecycle.sql` | Expands check constraint `chk_reservations_status` to include `Completed`. Adds composite index `idx_reservations_customer_visit (CustomerId, StartDateTime, Id)` for efficient history querying. |
| `05_reservation_concurrency.sql` | Verifies and enforces composite index `idx_reservations_table_status_period (TableId, Status, StartDateTime, EndDateTime)` to optimize transactional overlap lookups. |
| `06_reservation_outbox.sql` | Creates `ReservationOutbox` table (`Id`, `EventId`, `EventType`, `SchemaVersion`, `AggregateType`, `AggregateId`, `MessageKey`, `Payload`, `OccurredAtUtc`, `CreatedAtUtc`, `ProcessedAtUtc`, `AttemptCount`, `NextAttemptAtUtc`, `LastError`, `Status`, `LockId`, `LockedUntilUtc`), unique index `uq_outbox_event_id`, and indices `idx_outbox_pending` and `idx_outbox_processed_at`. |

---

## Sprint 1 — Foundation & Core Access

### Sprint 1 Goal

Deliver secure registration/login, role-based access control, customer profile management, and core restaurant table management, supported by containerization and CI/CD configuration.

### Sprint 1 Team Members

| Team member | Student ID | Sprint 1 role |
| --- | --- | --- |
| D.M.N. Pesanjith | IT24101505 | Business Analytics / Project Management |
| H. L. P. S. Perera | IT24101848 | QA Engineer |
| H.R.M.A.A. Bandara | IT24100315 | Developer |
| Wijesinghe K. | IT24102587 | DevOps |

### Completed Features (Sprint 1)

| Story | Implemented behavior |
| --- | --- |
| **SR-7** — User Registration | Customer registration, duplicate-email checks, BCrypt password hashing, and authorization-code checks for Admin/KitchenStaff registration. |
| **SR-8** — JWT Authentication and Login | Credential validation, rejection of inactive users, signed JWT issuance, and bearer-token validation in both APIs. |
| **SR-9** — Role-Based Access Control | Customer, Admin, and KitchenStaff roles; backend authorization attributes/policies and protected frontend routes. |
| **SR-10** — Customer Profile Management | Authenticated profile retrieval and contact-information updates using the user ID from JWT claims, with duplicate-email checks. |
| **SR-11** — Restaurant Table Creation | Admin-only creation with table number, capacity, location, validated initial status, and duplicate table-number handling. |
| **SR-12** — Table Management and Status Updates | Admin table listing/filtering, detail retrieval, capacity/location updates, occupied-table release, and soft deactivation. |

Table statuses in Sprint 1 are `Available`, `Occupied`, and `Inactive`. The update endpoint normally changes capacity/location. An occupied table can be released by explicitly requesting `Available`, including capacity/location changes in that request; other occupied-table edits and occupied-table deactivation are rejected. Deactivation sets `IsActive` to false and status to `Inactive`, preserving the database row. Arbitrary status transitions and reactivation are not implemented by the table update endpoint.

---

## System Architecture

```text
                                 +-------------------------+
                                 |  Browser / Web Client   |
                                 |  (React 19 + Vite SPA)  |
                                 +------------+------------+
                                              |
                     +------------------------+------------------------+
                     | HTTP / REST (JWT Bearer)                        | HTTP / REST (JWT Bearer)
                     v                                                 v
        +--------------------------+                      +--------------------------+
        |  Identity Microservice   |                      | Reservation Microservice |
        |     (ASP.NET Core)       |                      |     (ASP.NET Core)       |
        +------------+-------------+                      +------------+-------------+
                     |                                                 |
                     | ADO.NET (MySqlConnector)                        | ADO.NET (Pessimistic Locks & Outbox)
                     v                                                 v
        +--------------------------+                      +--------------------------+
        |    Identity Database     |                      |   Reservation Database   |
        |  (MySQL 8.0: Users,      |                      |  (MySQL 8.0: Tables,     |
        |   Roles, Profiles)       |                      |   Reservations, Outbox)  |
        +--------------------------+                      +------------+-------------+
                                                                       |
                                                                       | In-Transaction Insert
                                                                       v
                                                          +--------------------------+
                                                          |    ReservationOutbox     |
                                                          +------------+-------------+
                                                                       |
                                                                       | SELECT ... FOR UPDATE SKIP LOCKED
                                                                       v
                                                          +--------------------------+
                                                          |  OutboxPublisherService  |
                                                          |    (Hosted Background)   |
                                                          +------------+-------------+
                                                                       |
                                                                       | Confluent.Kafka Producer
                                                                       v
                                                          +--------------------------+
                                                          |   Apache Kafka (KRaft)   |
                                                          | Topic: reservations.v1   |
                                                          +--------------------------+
```

Nginx routes incoming traffic for containerized deployments. Frontend API clients attach the stored JWT to outbound requests; microservices independently validate the token signature, issuer, audience, and role claims.

---

## Technology Stack

| Area | Repository implementation |
| --- | --- |
| **Frontend** | React 19, Vite, React Router 7, Axios, Recharts (reporting analytics), Lucide React icons |
| **Backend** | ASP.NET Core Web API, .NET 10 (`net10.0`) |
| **Microservices** | Identity Service (port 5001), Reservation Service (port 5000) |
| **Data Access** | ADO.NET direct parameterized SQL through `MySqlConnector 2.4.0` |
| **Database** | MySQL 8.0 Community Server; separate `restaurant_identity_db` and `restaurant_reservation_db` schemas |
| **Authentication** | JWT Bearer authentication (`Microsoft.AspNetCore.Authentication.JwtBearer 8.0.13`) and BCrypt password hashing (`BCrypt.Net-Next`) |
| **Event Streaming** | Apache Kafka 3.9 in KRaft mode (no ZooKeeper), `Confluent.Kafka 2.6.1` .NET client |
| **Reporting & Export** | `ClosedXML 0.105.0` (Excel .xlsx spreadsheet generation), custom UTF-8 BOM CSV generator with formula injection defense |
| **API Documentation** | Swagger / OpenAPI (`Swashbuckle.AspNetCore 6.6.2`) in Development mode |
| **Container Hosting** | Multi-stage Dockerfiles; Nginx serves the React application and reverse-proxies API requests |
| **Local Orchestration** | Docker Compose with five services (`mysql`, `kafka`, `identity-service`, `reservation-service`, `frontend`) |
| **CI/CD & Cloud Target** | GitHub Actions, Azure Container Registry, Azure Container Apps, Azure OIDC federated authentication |
| **Automated Testing** | xUnit, Moq, and FluentAssertions for backend unit/integration tests; Node.js test runner for frontend |
| **Metrics & Monitoring** | `prometheus-net.AspNetCore 8.2.1` metrics middleware in both microservices |

---

## Project Structure

```text
Smart-Restaurant-Management-System/
├── backend/
│   ├── identity-service/              # Authentication, roles, profile management
│   │   ├── Controllers/               # AuthController, ProfileController
│   │   ├── Models/                    # User, UserRole, RegistrationRequest
│   │   ├── Repositories/              # UserRepository, direct ADO.NET
│   │   └── Dockerfile
│   ├── reservation-service/           # Table & reservation management, reporting, outbox
│   │   ├── Controllers/               # TablesController, ReservationsController, ReportsController
│   │   ├── DTOs/                      # Availability, reservation, admin, report DTOs
│   │   ├── Events/                    # ReservationEventEnvelope, event payloads, event factory
│   │   ├── Models/                    # Reservation, RestaurantTable, OutboxEvent, policies
│   │   ├── Repositories/              # TableRepository, ReservationRepository, OutboxRepository
│   │   ├── Services/                  # AvailabilitySearchService, OutboxPublisherService, ReportService
│   │   └── Dockerfile
│   ├── order-service/                 # Sprint 3 service scaffold
│   └── billing-report-service/        # Future service scaffold
├── frontend/
│   └── restaurant-web/                # React SPA
│       ├── src/
│       │   ├── components/            # Layout, TopBar, Sidebar, Modals, Landing
│       │   ├── pages/                 # CustomerPortal, ActiveTables, AvailabilitySearch,
│       │   │                          # ReservationReview, ReservationConfirmation, ReservationHistory,
│       │   │                          # ReservationDetail, ReservationReschedule, AdminReservations,
│       │   │                          # ReservationReports, LandingPage
│       │   ├── context/               # AuthContext (JWT management & decoded user state)
│       │   └── routes/                # AppRoutes, ProtectedRoute (role-based routing)
│       ├── Dockerfile                 # Local Nginx container build
│       └── Dockerfile.azure           # Cloud Nginx container build with HTTPS upstreams
├── database/
│   ├── identity-db/
│   │   └── 01_init_identity.sql       # Identity schema & initial admin/staff seed
│   └── reservation-db/
│       ├── 01_init_reservation.sql    # RestaurantTables schema & seed data
│       ├── 02_reservations.sql        # Reservations table & period constraints
│       ├── 03_reservation_creation.sql# CustomerId, BookingReference, idempotency index
│       ├── 04_reservation_lifecycle.sql# Completed status & customer visit history index
│       ├── 05_reservation_concurrency.sql# Concurrency composite lookup index
│       └── 06_reservation_outbox.sql  # ReservationOutbox table, leasing columns & indexes
├── tests/
│   └── unit/
│       ├── identity-service-tests/    # xUnit test suite for Identity Service
│       └── reservation-service-tests/ # xUnit test suite for Reservation Service
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Continuous integration workflow (build & unit tests)
│       └── cd.yml                     # Continuous deployment workflow (ACR & Container Apps)
├── docker-compose.yml                  # 5-service local environment (MySQL, Kafka, APIs, Web)
├── .env.example                       # Environment configuration template
└── README.md
```

---

## Local Development

### Prerequisites

- **Docker Desktop** (with Compose) for containerized dependencies.
- **.NET 10 SDK** (`net10.0`) for backend microservice development.
- **Node.js** (v20.19+ or v22.12+) and **npm** for frontend development.
- **MySQL 8.0** (can be run via Compose).

### Step 1: Environment Configuration

Copy `.env.example` to `.env` in the repository root and configure the required settings:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_HOST_PORT=3306
IDENTITY_DB_NAME=restaurant_identity_db
RESERVATION_DB_NAME=restaurant_reservation_db
JWT_KEY=SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!
JWT_ISSUER=SmartRestaurant
JWT_AUDIENCE=SmartRestaurantUsers
STAFF_AUTHORIZATION_CODE=STAFF_SECRET_CODE_2026
```

### Step 2: Running Dependencies (MySQL & Kafka)

Start the shared infrastructure services using Docker Compose:

```sh
docker compose up -d mysql kafka
```

The MySQL container automatically runs all initialization scripts in `database/identity-db/` and `database/reservation-db/` upon initial volume creation.

### Step 3: Running Backend Microservices

In separate terminal sessions, launch the microservices:

```sh
# Terminal 1: Identity Service (Port 5001)
dotnet run --project backend/identity-service/identity-service.csproj --no-launch-profile --urls http://localhost:5001

# Terminal 2: Reservation Service (Port 5000)
dotnet run --project backend/reservation-service/reservation-service.csproj --no-launch-profile --urls http://localhost:5000
```

When running locally with `ASPNETCORE_ENVIRONMENT=Development`, Swagger OpenAPI documentation is available at:
- Identity Service: `http://localhost:5001/swagger`
- Reservation Service: `http://localhost:5000/swagger`

### Step 4: Running the Frontend Application

In a third terminal session, install dependencies and start the Vite development server:

```sh
cd frontend/restaurant-web
npm ci
npm run dev
```

Navigate to `http://localhost:5173`. The development server proxies Identity requests to `http://localhost:5001/api` and Reservation requests to `http://localhost:5000/api`.

---

## Docker / Docker Compose

The complete five-service ecosystem can be executed entirely within Docker:

```sh
docker compose up --build -d
docker compose ps
```

Access the application at `http://localhost`. Stop the environment using `docker compose down` (the named `mysql_data` and `kafka_data` volumes are preserved).

| Service | Container Details | Published Port |
| --- | --- | --- |
| `mysql` | MySQL 8.0, initialization SQL scripts, persistent volume, automated healthcheck | `3306` (host configurable) |
| `kafka` | Apache Kafka 3.9 in KRaft mode, auto-creates topic `restaurant.reservations.v1` (4 partitions) | `9092` |
| `identity-service` | ASP.NET Core .NET 10 runtime image, waits for MySQL healthcheck | `5001` |
| `reservation-service` | ASP.NET Core .NET 10 runtime image, waits for MySQL & Kafka healthchecks | `5000` |
| `frontend` | Multi-stage build (Node 20 build stage, Nginx Alpine runtime serving static bundle) | `80` |

---

## Automated Unit Testing

The repository contains xUnit test suites covering developer business logic, validation rules, concurrency semantics, event serialization, and controller behavior.

Execute backend unit tests from the repository root:

```sh
# Identity Service unit tests
dotnet test tests/unit/identity-service-tests/identity-service-tests.csproj --configuration Release

# Reservation Service unit tests
dotnet test tests/unit/reservation-service-tests/reservation-service-tests.csproj --configuration Release
```

Execute frontend test suites from `frontend/restaurant-web`:

```sh
npm test
```

---

## CI / CD Pipelines

### Continuous Integration (CI)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) executes on every push and pull request targeting `develop` or `main`:
1. **Repository Structure Validation:** Verifies the presence of all required project directories.
2. **Frontend Build Check:** Installs dependencies using `npm ci` and verifies production bundling via `npm run build`.
3. **Backend Build Check:** Restores dependencies and builds all backend microservice projects in `Release` configuration.
4. **Backend Automated Tests:** Executes all xUnit test projects in `Release` mode.

### Continuous Deployment (CD)

[`.github/workflows/cd.yml`](.github/workflows/cd.yml) triggers on pushes to `develop`:
1. Authenticates to Microsoft Azure using OpenID Connect (OIDC) federated credentials (`id-token: write`).
2. Authenticates with Azure Container Registry (`acrcinnamonbistrodev`).
3. Builds container images for Identity Service, Reservation Service, and the Azure-configured frontend.
4. Pushes commit-SHA and branch-tagged images to ACR.
5. Deploys updated images to Azure Container Apps (`frontend-web`, `identity-api`, `reservation-api`).

---

## Security Practices & Data Protection

- **Cryptographic Password Hashing:** Passwords are salted and hashed using BCrypt (`BCrypt.Net-Next`) prior to database persistence. Plaintext passwords are never logged or stored.
- **Stateless JWT Authorization:** API endpoints validate bearer tokens checking cryptographic signing key, issuer, audience, and expiration. User identity (`CustomerId`) is extracted strictly from the validated token's `ClaimTypes.NameIdentifier` claim.
- **SQL Injection Prevention:** All database operations across Identity and Reservation services use direct parameterized ADO.NET SQL commands via `MySqlConnector`. String interpolation in SQL commands is strictly disallowed.
- **Pessimistic Concurrency & Double-Booking Prevention:** Table rows are locked via `SELECT ... FOR UPDATE` inside an InnoDB transaction before checking interval overlap and inserting reservations, preventing race-condition double bookings.
- **Idempotency Defense:** Critical booking mutations accept an `Idempotency-Key` header bound to the customer ID via a database unique index, preventing duplicate charges or bookings from repeated submissions.
- **Customer Privacy & Nondisclosure:** Customer reservation detail lookups return HTTP 404 Not Found if the requested booking belongs to another customer, preventing enumeration or existence probing by unauthorized actors.
- **Spreadsheet Formula Injection Mitigation:** CSV export routines sanitize text fields starting with formula operator characters (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote `'`.

---

## Sprint Status & Completed Work Items

### Sprint 1 Summary (10/10 Work Items Done)

| Jira Key | Work Item Summary | Status |
| --- | --- | --- |
| SR-7 | User Registration & Password Hashing | Done |
| SR-8 | JWT Authentication & Login Flow | Done |
| SR-9 | Role-Based Access Control & Navigation | Done |
| SR-10 | User Profile View & Management | Done |
| SR-11 | Restaurant Table Creation & Capacity Setup (CRUD) | Done |
| SR-12 | Restaurant Table Management & Status Updates (CRUD) | Done |
| SR-14 | Monorepo & Git Branching Setup | Done |
| SR-15 | GitHub Actions CI Pipeline Setup | Done |
| SR-16 | Unit Testing & Initial QA Test Cases | Done |
| SR-22 | DevOps Deployment Validation and Review Preparation | Done |

### Sprint 2 Summary (Completed Work Items)

| Jira Key | Work Item Summary | Status |
| --- | --- | --- |
| SR-13 | View Active Restaurant Tables and Seating Capacity | Done |
| SR-57 | Search Available Tables by Date, Time, Duration and Guest Count | Done |
| SR-58 | Create a Reservation with Booking Reference and Idempotency | Done |
| SR-59 | View, Edit or Cancel an Existing Customer Reservation | Done |
| SR-60 | Track Reservation Status and View Customer Booking History | Done |
| SR-61 | Manage Customer Reservations from the Admin Dashboard | Done |
| SR-62 | Prevent Overlapping Reservations and Concurrent Double Booking | Done |
| SR-63 | Reservation Reporting & Analytics Engine (CSV & XLSX Exports) | Done |
| SR-101 | Transactional Outbox Schema & Event Envelope Implementation | Done |
| SR-114 | Publish Reservation Lifecycle Events to Apache Kafka | Done |
| SR-112 | Cinnamon Bistro Public Landing Page & Atmosphere Showcase | Done |

---

## Sprint 3 — Next Scope

Sprint 3 shifts focus to restaurant dining operations, menu catalog management, and kitchen fulfillment:

1. **Digital Menu Management:** Hierarchical category browsing, dietary tags (vegetarian, vegan, gluten-free), dynamic pricing, allergen warnings, and item availability toggles.
2. **Customer Table Ordering:** Table-side ordering interface allowing seated guests to place and modify orders linked to their active table or reservation.
3. **Kitchen Display System (KDS) & Order Queue:** Real-time kitchen dashboard displaying incoming orders, preparation status transitions (`Received` → `Preparing` → `Ready` → `Served`), and order item timers.
4. **Inter-Service Event Consumption:** Consuming reservation and table status events from Apache Kafka within the ordering and kitchen workflows.

---

## Team

| Team member | Student ID | Sprint 1 role | Sprint 2 role |
| --- | --- | --- | --- |
| D.M.N. Pesanjith | IT24101505 | Business Analytics / Project Management | DevOps |
| H. L. P. S. Perera | IT24101848 | QA Engineer | Developer |
| H.R.M.A.A. Bandara | IT24100315 | Developer | Business Analytics |
| Wijesinghe K. | IT24102587 | DevOps | QA Engineer |

---

## Repository / Contribution Workflow

Git history follows feature branch workflows merged into integration branches through pull requests:
- Create scoped feature branches (`feature/SR-XX-description`) off `develop`.
- Submit PRs into `develop` with completed pull request templates, user story references, and technical descriptions.
- Code merges require passing CI workflows (build checks and unit tests).
- Pushes to `develop` automatically trigger the continuous deployment pipeline to Azure Container Apps.
- 
