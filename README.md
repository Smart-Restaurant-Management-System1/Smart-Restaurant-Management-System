# Cinnamon Bistro

**Smart Restaurant Table Reservation & Order Management System**

SE3022 Case Study Project — Year 3 Semester 1

## Overview

Cinnamon Bistro is an enterprise-grade smart restaurant management platform engineered across four sprints using a microservices architecture, a modern React web frontend, containerized infrastructure, and an event-driven messaging backbone.

- **Sprint 1 (Completed):** Established Identity & Access Management (JWT authentication, BCrypt hashing, role-based authorization for Customer, Admin, and KitchenStaff), customer profile management, core restaurant dining table configuration, multi-container Docker deployment, and CI/CD pipelines.
- **Sprint 2 (Completed):** Delivered complete end-to-end table reservation management, real-time availability search with local restaurant operating rules (`Asia/Colombo`), pessimistic row-level concurrency control (`SELECT ... FOR UPDATE`) preventing double-booking, customer reservation maintenance (rescheduling with self-exclusion and soft cancellation), administrative reservation management with controlled status transitions, analytics and reporting (with CSV/XLSX exports and spreadsheet formula injection defense), public landing experience, and asynchronous event publishing via the Transactional Outbox pattern and Apache Kafka (KRaft mode).
- **Sprint 3 (Completed):** Delivered administrative menu catalog management, hybrid image asset storage (Azure Blob + local fallback), customer menu browsing with dietary preferences, persistent order cart operations, atomic table-side dine-in ordering, reservation-linked pre-ordering, real-time customer order tracking, kitchen queue display system (KDS), serialized kitchen status transitions under pessimistic locks, order lifecycle event streaming to Apache Kafka (`order-lifecycle-events`) via the Transactional Outbox pattern, and luxury boutique UI harmonization.
- **Sprint 4 (Completed):** Delivered payment gateway integration (PayHere sandbox, MD5 signature hashing, IPN/webhook processing, printable tax invoices, pre-pay dining model), centralized staff and customer user management dashboard (SR-218), customer dining and order notification center (SR-220), customer feedback and star ratings moderation (SR-219), administrative security audit logging with compliance reporting (SR-223), advanced reservation and order search with executive ClosedXML Excel and CSV export (SR-222/SR-248), customer self-service profile and password security (SR-224), disposable email registration prevention and auth hardening (SR-225/SR-296), and end-to-end UI consistency and cross-viewport responsiveness (SR-294).

---

## Project Sprint Matrix & Team Roles

### Team Members & Role Rotation (All 4 Sprints)

| Team Member | Student ID | Sprint 1 Role | Sprint 2 Role | Sprint 3 Role | Sprint 4 Role |
| --- | --- | --- | --- | --- | --- |
| **Wijesinghe K.** | IT24102587 | DevOps | QA Engineer | Business Analytics | Developer |
| **D.M.N. Pesanjith** | IT24101505 | Business Analytics / Project Management | DevOps | Developer | QA Engineer |
| **H. L. P. S. Perera** | IT24101848 | QA Engineer | Developer | DevOps | Business Analytics |
| **H.R.M.A.A. Bandara** | IT24100315 | Developer | Business Analytics | QA Engineer | DevOps |

### Sprint Deliverables & Technologies Summary

| Sprint | Focus & Scope (What Was Done) | Core Technologies & Libraries Used | Lead Developer |
| --- | --- | --- | --- |
| **Sprint 1** | **Foundation, Identity & Tables:** User registration, BCrypt password hashing, JWT stateless authentication, role-based authorization (Customer, Staff, Admin), user profile view, restaurant dining table capacity configuration (CRUD), monorepo setup, multi-stage Dockerfiles, and GitHub Actions CI pipeline. | ASP.NET Core Web API (.NET 10), React 19, Vite, MySQL 8.0, ADO.NET (`MySqlConnector`), JWT Bearer, BCrypt.Net, Docker, GitHub Actions, Nginx | H.R.M.A.A. Bandara |
| **Sprint 2** | **Reservations, Concurrency & Events:** End-to-end table availability search under Sri Lanka time (`Asia/Colombo`), pessimistic row-level locking (`SELECT ... FOR UPDATE`) preventing double-booking, customer self-service reservation modification, admin reservation management, CSV/XLSX reporting, public landing page, and Transactional Outbox Kafka event streaming (`reservations.v1`). | ASP.NET Core, React, MySQL 8.0 (InnoDB Row Locks), Apache Kafka 3.9 (KRaft mode), `Confluent.Kafka`, ClosedXML, Transactional Outbox Worker, Lucide React | H. L. P. S. Perera |
| **Sprint 3** | **Menu, Ordering & Kitchen KDS:** Administrative menu management, hybrid image asset storage (Azure Blob + local fallback), dietary & category filtering, persistent authenticated order cart, table-side dine-in ordering, reservation-linked pre-ordering, real-time customer order tracking, kitchen queue display (KDS), serialized order status locking, and Kafka order lifecycle event publishing (`order-lifecycle-events`). | ASP.NET Core, React, MySQL 8.0, Apache Kafka, Azure Blob Storage, FluentValidation, Playfair Display Luxury CSS Theme, Docker Compose | D.M.N. Pesanjith |
| **Sprint 4** | **Payments, Operations, Security & UI:** PayHere sandbox payment gateway (pre-pay dining model, MD5 hash verification, IPN webhooks, 30-min unpaid order auto-expiry, printable PDF tax invoice modal), centralized staff & user management dashboard, customer dining notifications, customer feedback & rating moderation, operational analytics dashboard, advanced multi-criteria search, ClosedXML-styled Excel (.xlsx) & injection-neutralized CSV export, administrative security audit logging, locked email & BCrypt password security, disposable email DNS defense, and unified luxury UI consistency & mobile responsiveness. | ASP.NET Core (.NET 10), React 19, `ClosedXML` 0.105.0, `ExcelJS` 4.4.0, `jsPDF` 4.2.1, `jsPDF-AutoTable` 5.0.8, Isolated Iframe Print Engine, PayHere Sandbox API, Recharts, DNS MX Validator | Wijesinghe K. |

---

## Sprint 4 — Payments, Administration & System Operations

### Sprint 4 Overview

Sprint 4 delivers the core developer implementation for Cinnamon Bistro's operational and financial capabilities. It encompasses payment gateway integration, centralized staff and user administration, customer communication and feedback loops, advanced multi-criteria querying, executive Excel and PDF reporting, authentication hardening, and end-to-end visual and responsive harmonization.

**End-to-End Administrative & Payment Lifecycle:**
$$\text{Customer Portal} \longrightarrow \text{Pre-Pay Dining Model} \longrightarrow \text{PayHere Checkout \& Webhook} \longrightarrow \text{Kitchen KDS Release} \longrightarrow \text{Customer Feedback / Alerts} \longrightarrow \text{Admin Audit \& Executive Reporting}$$

1. **Digital Payments & Invoicing:** Integration with PayHere payment gateway sandbox, implementing cryptographic hash validation, instant payment notifications (IPN), automated 30-minute order expiry, printable tax invoices, and pre-pay dining gates.
2. **Staff & User Governance:** Centralized administration of customer and staff accounts, instant account status toggling (`Active`, `Blocked`, `Deactivated`), role elevation protection, and soft deletion.
3. **Customer Feedback & Moderation:** End-to-end customer ratings and reviews, owner-exclusive modification/deletion rights, administrative moderation, and official restaurant reply threads.
4. **Customer Dining Notifications:** Unified notification center delivering real-time and persisted alerts for booking confirmations, schedule changes, and kitchen order milestones.
5. **Operational Analytics & Audit Trail:** Executive KPI dashboard tracking daily revenue, guest volumes, and table loads; paired with immutable administrative audit logging supporting Excel, CSV, and branded PDF exports.
6. **Advanced Operations Search & Executive Export:** High-performance multi-criteria search for reservations and orders, accompanied by ClosedXML-styled executive Excel workbooks and CSV exports with spreadsheet formula injection defense.
7. **Security Hardening & Account Governance:** Disposable email domain blacklisting, DNS MX record validation, locked email identifiers, self-service password updates, and explicit feedback for blocked accounts.
8. **UI Consistency & Responsive Design:** Comprehensive visual harmonization across 25+ views, custom 6px gold scrollbars, table responsive overflow wrappers, WCAG AA alert contrast, and mobile navigation auto-dismissal.

### Sprint 4 Team Members

| Team member | Student ID | Sprint 4 role |
| --- | --- | --- |
| Wijesinghe K. | IT24102587 | Developer |
| D.M.N. Pesanjith | IT24101505 | QA Engineer |
| H. L. P. S. Perera | IT24101848 | Business Analytics |
| H.R.M.A.A. Bandara | IT24100315 | DevOps |

### Sprint 4 Developer Scope

| Jira ID | Feature | Result |
| --- | --- | --- |
| **SR-280** | PayHere Payment Gateway & Pre-Pay Dining Model | Full PayHere sandbox checkout, MD5 hash verification, asynchronous IPN webhook handling, printable PDF tax invoice modal, and automated 30-minute unpaid order expiry. |
| **SR-218** | Centralized User & Staff Management Dashboard | Admin user directory with multi-role filtering, staff account provisioning, status toggles (`Active`, `Blocked`, `Deactivated`), soft-deletion, and self-demotion protection. |
| **SR-219** | Customer Feedback Submission & Rating Moderation | 5-star rating system, dining feedback submission, customer edit/delete ownership, admin reply moderation, and luxury confirmation modals. |
| **SR-220** | Customer Dining & Order Notification Center | Real-time and persistent in-app notifications for reservation updates, order lifecycle milestones, unread counters, and bulk read toggles. |
| **SR-221** | Admin Operational Dashboard & Analytics | Executive KPI metrics aggregating daily revenue, active reservations, dining load, table occupancy, and kitchen throughput. |
| **SR-222** | Advanced Reservation & Order Search Engine | Multi-parameter filtering (date ranges, reference keywords, status, table assignments, amount bounds) with paginated result sets. |
| **SR-223** | Administrative Security Audit Logging & Export | Immutable audit trail capturing administrative mutations, user status changes, and operational overrides, with Excel, CSV, and branded PDF exports. |
| **SR-224** | Customer Profile Self-Service Management | Customer contact info updates with locked email identity and secure BCrypt self-service password changes with session synchronization. |
| **SR-225** | Authentication Hardening & Session Governance | Strict backend role-based access control, token expiration validation, unauthorized session invalidation, and blocked user restrictions. |
| **SR-248** | Executive Styled Excel (.xlsx) & Secure CSV Export | Custom-styled ClosedXML Excel workbooks (charcoal/gold styling, formatted currency, auto-fit columns) and CSV formula injection neutralization (`=`, `+`, `-`, `@`). |
| **SR-294** | UI Consistency & Cross-Viewport Responsiveness | Harmonized typography, custom 6px gold scrollbars, responsive data grids, accessible high-contrast alert boxes, and mobile navigation auto-dismissal across all pages. |
| **SR-296** | Disposable Email Defense & Registration Validation | Verification pipeline rejecting temporary/disposable email domains and validating DNS MX record deliverability during customer registration. |

### Payment Processing & Pre-Pay Dining (SR-280)

- **Pre-Pay Dining Architecture:** Enforces payment verification prior to kitchen queue acceptance. When an order is placed, it enters `PendingPayment` status until settled, eliminating uncollectable dining debt.
- **PayHere Sandbox Integration:**
  - `POST /api/payments/checkout`: Generates payment parameter payload including merchant ID, currency (`LKR`), formatted amount, customer contact details, and cryptographic hash:
    $$\text{hash} = \text{MD5}\Big(\text{merchant\_id} + \text{order\_id} + \text{amount\_formatted} + \text{currency} + \text{UPPERCASE}(\text{MD5}(\text{merchant\_secret}))\Big)$$
  - `POST /api/payments/payhere-notify`: Asynchronous Instant Payment Notification (IPN) webhook verifying PayHere signatures, transitioning payment to `Paid`, and releasing order to kitchen queue (`Pending`).
  - `GET /api/payments/verify/{orderId}`: Polling fallback endpoint allowing frontend order tracking to verify payment completion upon redirect return.
  - `POST /api/payments/admin/verify`: Administrative manual verification for cash or direct bank transfer settlements.
- **Automated Order Expiration Worker:** `OrderExpiryBackgroundService` executes periodically every 60 seconds, identifying unpaid orders exceeding the 30-minute checkout window, marking them `Cancelled`, and freeing reserved table capacity.
- **Printable Tax Invoice / Receipt Modal:** Generates compliant, itemized tax invoices rendered inside an isolated iframe, complete with bistro branding, order references, breakdown of subtotal, taxes, service charges, and browser print triggers.

### Centralized Staff & User Management (SR-218)

- **Administrative User Portal:** `AdminUserManagementPage.jsx` provides an administrative console to manage all registered users (Customers, Staff, and Admins) with keyword search, role dropdown filters, and status badges.
- **Account Governance & Status Control:**
  - `PATCH /api/admin/users/{id}/status`: Toggles account status between `Active`, `Blocked`, and `Deactivated`.
  - Enforces administrative safeguards preventing admins from blocking or demoting their own active accounts.
  - Soft-deletion architecture (`DELETE /api/admin/users/{id}`) setting `IsDeleted = 1` and `DeletedAtUtc`, preserving historical references in past reservations, orders, and audit logs.
- **Role Elevation Security:** Staff provisioning (`POST /api/admin/users`) is strictly restricted to authenticated Administrators, preventing privilege escalation.

### Customer Feedback & Rating Moderation (SR-219)

- **Guest Review Engine:** Authenticated customers submit 1-to-5 star ratings and written reviews evaluating their dining experience across food quality, ambiance, and service.
- **Ownership & Access Controls:** Customers retain full CRUD control over their own submissions (edit comments, update star ratings, or delete reviews) enforced by `CustomerId` claim validation.
- **Administrative Moderation & Replies:**
  - Administrators review incoming feedback, approve reviews for public showcase, and publish official restaurant responses (`AdminReply`).
  - Text wrapping safeguards (`overflow-wrap: break-word`, `word-break: break-word`) preventing UI distortion from long continuous strings.
  - Reusable luxury `ConfirmationModal` replacing native browser confirm dialogs for destructive actions.

### Customer Dining & Order Notifications (SR-220)

- **Unified In-App Notification Center:** A dedicated notification drawer and bell icon counter keeping customers informed throughout their dining lifecycle.
- **Automated Lifecycle Triggers:**
  - Reservation confirmations, modifications, and cancellations.
  - Real-time kitchen order updates (`Preparing`, `Ready`, `Served`).
  - Payment settlement receipts and order expiration alerts.
- **State Management:** Supports individual read status updates (`PATCH /api/notifications/{id}/read`) and bulk read acknowledgments (`PATCH /api/notifications/read-all`).

### Operational Analytics Dashboard (SR-221)

- **Real-Time Operational Indicators:** Aggregates live restaurant performance metrics on `AdminOperationalDashboardPage.jsx`:
  - Daily gross revenue and average ticket sizes.
  - Current day reservation volume and guest headcounts.
  - Real-time table occupancy percentages.
  - Active kitchen queue order load and preparation wait times.
- **Executive Decision Support:** Empowers management to identify service bottlenecks, peak seating hours, and menu popularity trends.

### Advanced Search, Multi-Criteria Filtering & Executive Export (SR-222, SR-248)

- **Comprehensive Search Engine:** Empowers administrators to query large volumes of reservations and orders via combined criteria:
  - Text search: Customer full name, email, phone number, and reservation/order reference.
  - Temporal filtering: Custom date ranges (`startDate` to `endDate`).
  - Categorical filters: Status multi-select (`Pending`, `Confirmed`, `Seated`, `Completed`, `Cancelled`).
  - Table assignments and minimum/maximum transaction amounts.
- **ClosedXML Executive Excel (.xlsx) Export:**
  - Generates branded, styled workbooks featuring dark charcoal header rows (`#2A2A2A`), gold accent text (`#D4AF37`), explicit column widths, formatted currency cells (`Rs. #,##0.00`), and formatted ISO timestamps.
  - Configured without freeze pane artifacts to avoid split-screen presentation issues across standard versions of Microsoft Excel.
- **Formula-Injection Safe CSV Export:**
  - Defends against CSV Formula Injection (CWE-1236) by inspecting every string field and prepending a single quote (`'`) to any value starting with `=`, `+`, `-`, or `@`.

### Administrative Security Audit Logging (SR-223)

- **Tamper-Evident Activity Trail:** Captures security-sensitive administrative operations across user management, reservation overrides, table mutations, and payment validations.
- **Audit Envelope Structure:** Records action type, target entity name, entity ID, actor user ID, actor email, client IP address, UTC timestamp, and a structured JSON payload capturing before/after operational state changes.
- **Multi-Format Compliance Export:** Administrative audit logs can be exported directly to styled Excel workbooks, formula-safe CSVs, or downloaded as branded PDF audit reports featuring restaurant verification badges and organized key-value summary blocks.

### Profile Governance & Authentication Security Hardening (SR-224, SR-225, SR-296)

- **Locked Email Identity Anchor:** Customer email addresses are locked against direct client modification to preserve identity integrity across payment and reservation history.
- **Self-Service Password Security:** Customers update account passwords via BCrypt hash verification with real-time strength indicators and synchronized token authentication context.
- **Disposable Email Prevention (SR-296):** Validates customer registration inputs against a blacklist of known temporary/disposable email domains and performs DNS MX record checks to ensure inbox deliverability.
- **Blocked Account Session Governance:** Authenticated requests from blocked or deactivated users are rejected with HTTP 403 Forbidden via `AccountDeactivatedException`, presenting clear guidance to contact restaurant administration.

### UI Consistency, Accessibility & Cross-Viewport Responsiveness (SR-294)

- **Luxury Boutique Design System:** Harmonized Playfair Display serif headings, Montserrat sans-serif body copy, dark theme surface hierarchy (`#121212`, `#1A1A1A`), and high-contrast light panels (`#FFFFFF`, `#1A1A1A` text).
- **Custom 6px Gold Scrollbars:** Elegant gold-themed webkit and Firefox scrollbars (`--gold-primary: #D4AF37`) replacing default browser scrollbars across all tables, drawers, and modal overlays.
- **Fluid Layouts & Mobile Navigation:** Controlled horizontal overflow wrappers on all data tables, fluid card stacking, high-contrast accessible error banners, and automatic mobile navigation drawer dismissal upon route selection.

### Document, Spreadsheet & PDF Generation Architecture

The system features a multi-tiered document generation architecture supporting enterprise reporting, financial auditing, and customer invoicing:

- **Server-Side Styled Excel (.xlsx) Generation via ClosedXML (`ClosedXML.Excel 0.105.0`):**
  - Implemented in C# backend (`AdminAuditLogsController.cs`, `AdminReservationsController.cs`, `AdminOrdersController.cs`, and `ReportExportService.cs`).
  - Constructs OpenXML-compliant binary spreadsheets (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) directly in memory as byte streams without COM or external Office dependencies.
  - Incorporates Cinnamon Bistro's luxury palette: Dark charcoal header background (`#2A2A2A`), gold accent text (`#D4AF37`), bold column labels, and bordered cells.
  - Enforces explicit cell data types: Currency formatting (`"Rs. " #,##0.00`), ISO 8601 timestamps (`yyyy-MM-dd HH:mm:ss`), dynamic column auto-fitting (`AdjustToContents()`), and un-split viewports free of freeze pane distortions.
- **Client-Side Spreadsheet Generation via ExcelJS (`exceljs 4.4.0`):**
  - Integrated in React frontend components for client-side workbook generation, dynamic cell styling, font weighting, and immediate browser Blob downloads.
- **Executive Vector PDF Audit Reports via jsPDF (`jspdf 4.2.1`) & jsPDF-AutoTable (`jspdf-autotable 5.0.8`):**
  - Integrated in `AdminAuditLogsPage.jsx` to render downloadable executive PDF audit reports directly in the client browser without backend overhead.
  - Features official brand header typography, security verification badge, filter criteria summary box, automatic column text wrapping, alternating row shading, and dynamic page numbering (`Page X of Y`).
- **Isolated Iframe Tax Invoice & Receipt Print Engine:**
  - Implemented across `PaymentModal.jsx`, `OrderReviewPage.jsx`, and `ReservationConfirmationPage.jsx`.
  - Dynamically mounts an isolated, sandboxed `<iframe>` to prevent global web styles from interfering with paper formatting.
  - Injects responsive print styling (`@media print`), itemized dining lines, tax calculations, PayHere transaction IDs, and invokes native `window.print()` for instant PDF saving or physical receipt printing.
- **Secure CSV Streaming with Formula Injection Defense (CWE-1236):**
  - Generates UTF-8 encoded text streams with Byte Order Mark (`EF BB BF`) for universal character rendering in Microsoft Excel.
  - Defends against CSV Injection / Formula Injection by inspecting every text field and prepending an apostrophe (`'`) to any string starting with `=`, `+`, `-`, or `@`.

### API Endpoints Added in Sprint 4

| Method | Route | Authorized Roles | Description |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | Admin | Retrieves paginated user list with role, status, and keyword filters (SR-218). |
| `POST` | `/api/admin/users` | Admin | Provisions new staff or administrative accounts (SR-218). |
| `PUT` | `/api/admin/users/{id}` | Admin | Updates user profile details, contact information, and role assignments (SR-218). |
| `PATCH` | `/api/admin/users/{id}/status` | Admin | Toggles account status between Active, Blocked, and Deactivated (SR-218). |
| `DELETE` | `/api/admin/users/{id}` | Admin | Performs soft deletion of a user account (SR-218). |
| `GET` | `/api/profile` | Customer, Staff, Admin | Retrieves profile of the authenticated user with locked email (SR-224). |
| `PUT` | `/api/profile` | Customer | Updates customer contact phone number and address (SR-224). |
| `POST` | `/api/profile/change-password` | Customer, Staff, Admin | Updates user password with current password verification (SR-224). |
| `POST` | `/api/payments/checkout` | Customer | Initiates PayHere checkout session and generates MD5 signature (SR-280). |
| `POST` | `/api/payments/payhere-notify` | Public (Webhook) | Asynchronous IPN webhook verifying PayHere transaction signatures (SR-280). |
| `GET` | `/api/payments/verify/{orderId}` | Customer | Fallback endpoint to poll payment verification status after checkout (SR-280). |
| `POST` | `/api/payments/admin/verify` | Admin | Manually verifies cash or bank transfer payment settlements (SR-280). |
| `GET` | `/api/feedback` | Public, Customer, Admin | Returns approved public feedback or full list for moderation (SR-219). |
| `POST` | `/api/feedback` | Customer | Submits dining review and 1-5 star rating (SR-219). |
| `PUT` | `/api/feedback/{id}` | Customer | Updates existing feedback submitted by the authenticated customer (SR-219). |
| `DELETE` | `/api/feedback/{id}` | Customer | Deletes existing feedback submitted by the authenticated customer (SR-219). |
| `POST` | `/api/feedback/{id}/reply` | Admin | Posts official restaurant moderation response to a feedback review (SR-219). |
| `PATCH` | `/api/feedback/{id}/status` | Admin | Toggles feedback public approval visibility status (SR-219). |
| `GET` | `/api/notifications` | Customer | Retrieves in-app notifications and unread alert counts (SR-220). |
| `PATCH` | `/api/notifications/{id}/read` | Customer | Marks a specific notification as read (SR-220). |
| `PATCH` | `/api/notifications/read-all` | Customer | Marks all notifications as read for the authenticated customer (SR-220). |
| `GET` | `/api/admin/analytics/overview` | Admin | Retrieves live operational analytics and restaurant KPI metrics (SR-221). |
| `GET` | `/api/admin/audit-logs` | Admin | Queries administrative audit trails with action and date filters (SR-223). |
| `GET` | `/api/admin/audit-logs/export-excel` | Admin | Exports audit logs as styled ClosedXML Excel workbook (SR-223). |
| `GET` | `/api/admin/audit-logs/export-csv` | Admin | Exports audit logs as formula-injection-safe CSV file (SR-223). |
| `GET` | `/api/admin/reservations/export-excel` | Admin | Exports advanced reservation search results as styled Excel workbook (SR-222, SR-248). |
| `GET` | `/api/admin/reservations/export-csv` | Admin | Exports advanced reservation search results as safe CSV file (SR-222, SR-248). |
| `GET` | `/api/admin/orders/export-excel` | Admin | Exports advanced order search results as styled Excel workbook (SR-222, SR-248). |
| `GET` | `/api/admin/orders/export-csv` | Admin | Exports advanced order search results as safe CSV file (SR-222, SR-248). |

### Database Schema & Migrations (Sprint 4)

Sprint 4 database enhancements are versioned via SQL migration scripts in `database/`:

| Migration Script | Service / Database | Scope & Changes Implemented |
| --- | --- | --- |
| `02_admin_user_management.sql` | `identity-db` | Adds `AccountStatus` (`Active`, `Blocked`, `Deactivated`), `IsDeleted`, `DeletedAtUtc`, `LastLoginAtUtc`, and `CreatedByAdminId` columns with soft-delete query filtering. |
| `11_customer_feedback.sql` | `reservation-db` | Creates `CustomerFeedback` table (`Id`, `CustomerId`, `CustomerName`, `Rating`, `Category`, `Comment`, `IsApproved`, `IsRead`, `AdminReply`, `AdminRepliedAtUtc`, timestamps) with check constraint `chk_feedback_rating (Rating BETWEEN 1 AND 5)`. |
| `12_payments.sql` | `reservation-db` | Creates `Payments` (`PaymentReference`, `OrderId`, `OrderReference`, `CustomerId`, `Amount`, `Currency`, `PaymentMethod`, `PaymentStatus`, `PayHerePaymentId`, timestamps) and `PaymentNotificationEvents` tables for IPN audit logging. |
| `13_customer_notifications.sql` | `reservation-db` | Creates `CustomerNotifications` table (`Id`, `CustomerId`, `Title`, `Message`, `Type`, `IsRead`, `ReferenceId`, `CreatedAt`) with composite index on customer and read status. |
| `14_admin_audit_logs.sql` | `reservation-db` | Creates `AdminAuditLogs` table (`Id`, `ActionType`, `EntityName`, `EntityId`, `PerformedByUserId`, `PerformedByEmail`, `IpAddress`, `DetailsJson`, `TimestampUtc`) with indexes on action type and timestamp. |

---

## Sprint 3 — Menu, Ordering & Kitchen Workflow

### Sprint 3 Overview

Sprint 3 delivers the complete digital dining and culinary fulfillment engine for Cinnamon Bistro. It bridges customer-facing menu discovery, persistent cart management, table-side and reservation-linked ordering, and real-time order tracking with back-of-house kitchen display and queue management. All mutations are safeguarded by strict row-level concurrency control, server-authoritative price validation, and transactional outbox event publishing to Apache Kafka (`order-lifecycle-events`).

**End-to-End Business Workflow:**
$$\text{Menu Catalog} \longrightarrow \text{Order Cart} \longrightarrow \text{Dine-in / Pre-Order Placement} \longrightarrow \text{Customer Tracking} \longrightarrow \text{Kitchen Queue (KDS)} \longrightarrow \text{Kafka Lifecycle Events}$$

1. **Menu Discovery:** Guests browse active culinary offerings, filtering dynamically by course categories and dietary preferences (vegetarian, vegan, gluten-free).
2. **Cart Staging:** Items are staged into a persistent, authenticated cart with server-validated unit prices and quantity management.
3. **Order Placement:** Customers place atomic dine-in orders (assigned to active physical tables) or pre-orders linked to upcoming confirmed reservations, protected by idempotency replay safeguards.
4. **Order Tracking:** Customers monitor live order progression through an interactive status stepper (`Pending` → `Preparing` → `Ready` → `Served`).
5. **Kitchen Display System (KDS):** Kitchen staff monitor prioritized order queues, transitioning tickets through the preparation lifecycle under pessimistic database row locks.
6. **Event-Driven Streaming:** Order lifecycle transitions emit schema-validated domain events to Kafka via the Transactional Outbox pattern for downstream analytics and notification processing.

### Sprint 3 Team Members

| Team member | Student ID | Sprint 3 role |
| --- | --- | --- |
| D.M.N. Pesanjith | IT24101505 | Developer |
| H. L. P. S. Perera | IT24101848 | DevOps |
| H.R.M.A.A. Bandara | IT24100315 | QA Engineer |
| Wijesinghe K. | IT24102587 | Business Analytics |

### Sprint 3 Developer Scope

| Jira ID | Feature | Result |
| --- | --- | --- |
| **SR-130** | Manage Menu Items, Prices and Availability | Admin CRUD endpoints for catalog items, multipart image uploads, category classification, dietary tags, and instant availability toggles. |
| **SR-131** | Browse Menu & Filter by Category / Dietary Preferences | Public customer catalog querying returning only active dishes (`IsAvailable = 1`), with real-time category, dietary, and keyword search filters. |
| **SR-132** | Persistent Order Cart Management | Authenticated customer cart operations (add, quantity increment/decrement, remove, clear) with server-authoritative price re-synchronization. |
| **SR-133** | Dine-In Table Ordering & Idempotency | Transactional table-side order creation (`POST /api/orders/dine-in`) with table validation, cryptographic reference generation (`ORD-XXXX-XXXX`), and replay defense. |
| **SR-134** | Reservation-Linked Pre-Ordering | Pre-order creation (`POST /api/orders/reservation-pre-order`) bound to upcoming reservations with ownership checks, duplicate prevention, and PR #61 idempotency fix. |
| **SR-135** | Real-Time Order Tracking & History | Unified customer query (`GET /api/orders/my-orders`) across dine-in and pre-orders with real-time status progression stepper and past order archives. |
| **SR-136** | Kitchen Queue Display System (KDS) | Staff/Admin kitchen dashboard (`GET /api/kitchen/queue`) aggregating pending and preparing orders sorted by FIFO priority and elapsed preparation wait timers. |
| **SR-137** | Kitchen Order Lifecycle Transitions & Locking | Controlled state progression (`Pending` → `Preparing` → `Ready` → `Served`) under InnoDB `SELECT ... FOR UPDATE` row locks with milestone timestamp auditing. |
| **SR-138** | Kafka Order Lifecycle Event Streaming | Transactional Outbox publishing of `OrderLifecycleEvent` envelopes (`OrderCreated`, `OrderPreparing`, `OrderReady`, `OrderServed`, `OrderCancelled`) to Kafka topic `order-lifecycle-events`. |
| **SR-211** | Luxury Boutique UI/UX Harmonization | Cohesive visual styling with Playfair Display typography, warm gold accents, charcoal dark theme, glassmorphism cards, and role-aware navigation guards. |
| **SR-278** | OrderCreated Kafka Event Routing Bug Fix | Resolved outbox publisher routing defect ensuring order lifecycle events are reliably published to `order-lifecycle-events` rather than falling back to reservation topics. |

### Menu Management (SR-130)

The menu management subsystem enables administrators to govern the restaurant's culinary offerings:
- **Administrative Operations:** `MenuItemsController.cs` exposes `POST /api/menu-items`, `PUT /api/menu-items/{id}`, and `PATCH /api/menu-items/{id}/availability`, secured by `[Authorize(Roles = AppRoles.Admin)]`.
- **Item Schema & Attributes:** Governs item name, description, course category (`Starter`, `Main`, `Dessert`, `Beverage`), price, dietary preferences (`Vegetarian`, `Vegan`, `Gluten-Free`), and availability status (`IsAvailable`).
- **Validation Pipeline:** Enforced via FluentValidation (`MenuItemCreateRequestValidator` and `MenuItemUpdateRequestValidator`):
  - Name required, length between 2 and 150 characters.
  - Description optional, maximum 1000 characters.
  - Price strictly greater than 0 (`Price > 0`), formatted to two decimal places.
  - Valid category enumeration membership.
  - Image file size bounded to a maximum of 5MB, restricted to safe image MIME types (`image/jpeg`, `image/png`, `image/webp`).
- **Hybrid Asset Storage:** Abstracted via `IImageStorageService` supporting Azure Blob Storage (`AzureBlobImageStorageService`) in cloud environments and fallback local physical storage (`LocalImageStorageService`) during local development and offline testing.
- **Frontend Management UI:** `MenuManagementPage.jsx` provides an administrative dashboard featuring live search, category grouping, modal create/edit forms with real-time image previews, and instant toggle switches for item availability.

### Customer Menu & Filtering (SR-131)

- **Public Catalog Retrieval (`GET /api/menu-items`):** Customers and unauthenticated visitors browse active dishes. The query enforces database-level filtering `WHERE IsAvailable = 1`, ensuring disabled items are never displayed or orderable.
- **Dynamic Category & Dietary Filtering:** `CustomerMenuPage.jsx` renders course category tabs (`All`, `Starters`, `Mains`, `Desserts`, `Beverages`) combined with multi-select dietary pills (`Vegetarian`, `Vegan`, `Gluten-Free`) and client-side instant keyword search.
- **UX States:** Complete visual feedback states including shimmering loading skeletons, empty state prompts when filters yield no matches, and non-blocking toast notifications on network errors.

### Cart Management (SR-132)

- **Authentication & Isolation:** `OrderCartController.cs` and `OrderCartService.cs` enforce `[Authorize(Roles = AppRoles.Customer)]`. Carts are strictly bound 1:1 to the authenticated `CustomerId` extracted from JWT claims (`ClaimTypes.NameIdentifier`). No user can inspect or mutate another customer's cart.
- **Cart Operations:**
  - `GET /api/cart`: Returns the customer's active cart, line items, item pricing, and calculated subtotals.
  - `POST /api/cart/items`: Adds an item to the cart. Revalidates item existence and `IsAvailable = 1`.
  - `PUT /api/cart/items/{itemId}`: Updates item quantity (`Quantity > 0`). Quantities reduced to zero trigger item removal.
  - `DELETE /api/cart/items/{itemId}`: Removes a single line item.
  - `DELETE /api/cart`: Empties the entire cart.
- **Server-Authoritative Price Synchronization:** Client-submitted prices are ignored. All unit prices and subtotal calculations are derived dynamically from database records in `MenuItems`, preventing client-side tampering before order checkout.
- **Database Schema:** Backed by `OrderCarts` and `OrderCartItems` tables with foreign keys and unique constraint `uq_order_carts_customer (CustomerId)`.

### Dine-in Ordering (SR-133)

- **Atomic Order Creation (`POST /api/orders/dine-in`):** Customers submit table-side orders for immediate dining:
  - Validates `TableId` exists and represents an active dining table (`RestaurantTables.IsActive = 1`).
  - Verifies cart contains valid items and calculates the authoritative total amount.
  - Generates a cryptographically secure, human-readable reference `ORD-XXXX-XXXX` using an unambiguous alphanumeric character set.
  - Under a database transaction (`IsolationLevel.ReadCommitted`), writes to `DineInOrders` (status `Pending`), inserts line items into `DineInOrderItems`, empties the customer's cart, and stages an `OrderCreated` event envelope into `ReservationOutbox`.
- **Idempotency Protection:** Clients transmit an `Idempotency-Key` header (UUID or client-generated token). The endpoint validates key uniqueness against unique index `uq_dine_in_orders_customer_idempotency`. Repeated requests return HTTP 200 OK with the existing order, preventing duplicate kitchen tickets or multiple charges.
- **Frontend Order Review:** `OrderReviewPage.jsx` displays an itemized checkout summary, table selection dropdown, special dining instructions input, and an animated placement confirmation redirecting to real-time tracking.

### Reservation-Linked Pre-Ordering (SR-134)

- **Pre-Order Placement (`POST /api/orders/reservation-pre-order`):** Enables customers to pre-select dishes for an upcoming dining reservation:
  - Validates that the target reservation exists, belongs to the authenticated customer, and is in an eligible state (`Pending` or `Confirmed`). Cancelled or completed reservations are rejected with HTTP 400 Bad Request.
  - Enforces single pre-order constraints per reservation via unique index `uq_reservation_pre_orders_reservation`.
  - Generates a reference formatted as `PRE-XXXX-XXXX`.
  - Transactionally creates `ReservationPreOrders` and `ReservationPreOrderItems`, stages an `OrderCreated` outbox event, and clears the active cart.
- **Idempotency State Fix (PR #61):** Resolved pre-order retry handling so idempotent duplicate requests correctly retain and return the existing pre-order details without throwing collision errors.
- **Frontend Pre-Order Flow:** `ReservationPreOrderPage.jsx` guides customers through selecting an eligible upcoming reservation, reviewing selected dishes, adding preparation notes, and submitting the pre-order.

### Order Tracking & History (SR-135)

- **Unified Querying (`GET /api/orders/my-orders`):** Executes a unified `UNION ALL` query merging `DineInOrders` and `ReservationPreOrders` for the authenticated customer ID, sorted newest first (`CreatedAt DESC`).
- **Normalized Lifecycle Progression:** Normalizes states across both ordering channels into a standardized progression:
  $$\text{Pending (Order Placed)} \longrightarrow \text{Preparing (In Kitchen)} \longrightarrow \text{Ready (Ready for Service)} \longrightarrow \text{Served (Delivered)}$$
- **Frontend Tracking Experience:** `OrderTrackingPage.jsx` and `orderTrackingHelpers.js` provide:
  - An interactive visual progress stepper highlighting current preparation stages and elapsed times.
  - Automatic 15-second background polling ensuring live updates without manual page refreshes.
  - Order history tab displaying past completed and served orders with collapsible line-item receipts.

### Kitchen Queue Display System (SR-136)

- **Kitchen Queue API (`GET /api/kitchen/queue`):** Accessible strictly to `[Authorize(Roles = AppRoles.KitchenStaff + "," + AppRoles.Admin)]`. Returns all active orders with status `Pending` or `Preparing`.
- **Priority & Urgency Sorting:** Orders are sorted chronologically (FIFO) by arrival timestamp. Each order envelope calculates an elapsed waiting duration in minutes.
- **Frontend KDS Dashboard (`KitchenQueuePage.jsx`):**
  - Two-column kanban board separating "New Orders (Pending)" and "In Preparation (Preparing)".
  - High-contrast visual cards showing order reference, table number or reservation tag, order type (Dine-in vs. Pre-order), item quantities, and special cooking instructions.
  - Dynamic urgency timer pills changing color as wait times escalate (Normal, Warning, Urgent).
  - Configurable auto-refresh toggle with 30-second polling.

### Kitchen Status Updates & Concurrency Control (SR-137)

- **Status Transition Endpoint (`PATCH /api/kitchen/orders/{orderReference}/status`):** Authorized kitchen staff update ticket status as culinary preparation progresses:
  - Allowed sequential transitions: `Pending` → `Preparing`, `Preparing` → `Ready`, `Ready` → `Served`.
  - Illegal status jumps (e.g., `Pending` → `Ready`, or reverting `Served` to `Preparing`) are rejected with HTTP 400 Bad Request.
- **Pessimistic Row-Level Locking:** To prevent concurrent kitchen staff members from simultaneously updating the same order ticket or overwriting state:
  ```sql
  SELECT Id, Status FROM DineInOrders WHERE OrderReference = @OrderReference FOR UPDATE;
  ```
  Transitions execute under an exclusive InnoDB row lock in a `ReadCommitted` transaction.
- **Audit Timestamps & Outbox Events:** The transaction updates milestone timestamps (`PreparingStartedAt`, `ReadyAt`, `ServedAt`) and stages corresponding `OrderPreparing`, `OrderReady`, or `OrderServed` events into `ReservationOutbox`.

### Kafka Lifecycle Integration (SR-138)

- **Order Event Envelope:** Standardized JSON structure defined in `OrderLifecycleEvent.cs` and `OrderLifecycleEventTypes.cs`:
  ```json
  {
    "eventId": "a7b3c2d1-e4f5-4a6b-8c9d-0e1f2a3b4c5d",
    "eventType": "OrderCreated",
    "schemaVersion": 1,
    "aggregateType": "Order",
    "aggregateId": "ORD-8F3K-9P2W",
    "messageKey": "ORD-8F3K-9P2W",
    "payload": { ... },
    "occurredAtUtc": "2026-09-25T10:15:30.123Z"
  }
  ```
- **Lifecycle Event Types:** `OrderCreated`, `OrderPreparing`, `OrderReady`, `OrderServed`, `OrderCancelled`.
- **Dedicated Topic:** Emitted to Apache Kafka topic `order-lifecycle-events` (configured with 4 partitions in KRaft mode).
- **Partition Ordering:** Partition key is set to `MessageKey = orderReference`, guaranteeing that all sequential lifecycle events for a given order ticket land on the exact same Kafka partition and are consumed in strict chronological order.
- **Outbox Publisher Worker (`OutboxPublisherService`):** Background hosted service polls `ReservationOutbox` using non-blocking row claims (`SELECT ... FOR UPDATE SKIP LOCKED`), lease-based lock coordination, at-least-once delivery, exponential backoff retries, and dead-letter isolation.

### SR-278 Bug Fix: Kafka Order Event Routing Defect

- **Problem & Observed Behavior:** Order lifecycle events (`OrderCreated`, `OrderPreparing`, etc.) were failing to publish to the dedicated `order-lifecycle-events` topic or were falling back to the reservation topic `restaurant.reservations.v1`, mixing order payloads into reservation event streams.
- **Root Cause Analysis:** In `OutboxPublisherService.cs`, topic selection was governed solely by:
  ```csharp
  string.Equals(outboxEvent.AggregateType, "Order", StringComparison.OrdinalIgnoreCase)
  ```
  When outbox events were inserted without an explicit `AggregateType` or when casing differed, the publisher fell back to the default reservation topic `_options.ReservationTopic` (`restaurant.reservations.v1`).
- **Implemented Fix (PR #63, commit `3972ef9`):**
  Added a robust helper `IsOrderLifecycleEvent(OutboxEvent outboxEvent)`:
  ```csharp
  private static bool IsOrderLifecycleEvent(OutboxEvent outboxEvent)
  {
      if (string.Equals(outboxEvent.AggregateType, "Order", StringComparison.OrdinalIgnoreCase))
          return true;

      if (!string.IsNullOrWhiteSpace(outboxEvent.EventType) &&
          outboxEvent.EventType.StartsWith("Order", StringComparison.OrdinalIgnoreCase))
          return true;

      return OrderLifecycleEventTypes.All.Contains(outboxEvent.EventType, StringComparer.OrdinalIgnoreCase);
  }
  ```
  The publisher inspects `AggregateType`, prefix matching, and known event type constants in `OrderLifecycleEventTypes`, ensuring all order-related events are strictly routed to `_options.OrderLifecycleTopic`.
- **Verification:** Verified via dedicated unit tests in `reservation-service-tests` validating topic resolution across all order event types, and confirmed in PR #63 review and build pipelines.

### UI/UX Harmonization (SR-211)

- **Luxury Boutique Design System:** Harmonized all customer, admin, and kitchen interfaces using Cinnamon Bistro’s signature design language:
  - Serif typography hierarchy powered by Google Font **Playfair Display** paired with modern sans-serif body text.
  - Refined warm gold accent palette (`#C5A880`, `#D4AF37`) layered against dark obsidian and charcoal surfaces (`#121212`, `#1E1E1E`).
  - Frosted glassmorphism panels, subtle metallic borders, and smooth hover micro-interactions.
- **Role-Aware Navigation & Post-Login Redirection:**
  - `postLoginRedirect.js` dynamically directs users to appropriate starting pages upon authentication based on role and intended destination (e.g., checkout redirecting to login and resuming at order review).
  - `roles.js` and `CUSTOMER_ORDERING_ROLES` provide unified client-side route guards.
- **Form Ergonomics & Feedback:** Accessible form inputs, high-contrast states, real-time input validation messaging, and non-blocking toast notifications.

### Security & Validation

- **Stateless JWT Authentication:** All non-public endpoints require valid Bearer tokens validated against cryptographic HMAC-SHA256 signature, issuer, audience, and expiration.
- **Role-Based Authorization (RBAC):** Strict attribute enforcement:
  - `AppRoles.Admin`: Menu item creation, editing, availability toggles, and administrative oversight.
  - `AppRoles.Customer`: Cart operations, dine-in ordering, pre-ordering, and personal tracking.
  - `AppRoles.KitchenStaff` & `AppRoles.Admin`: Kitchen queue inspection and status updates.
- **Customer Identity & Ownership Isolation:** All customer mutations derive `CustomerId` directly from JWT claims (`ClaimTypes.NameIdentifier`). Carts and order histories cannot be queried or mutated across customer boundaries.
- **Authoritative Pricing & Availability Enforcement:** Cart totals and order line-item amounts are recalculated strictly from server database records at transaction time, completely neutralizing client-side price tampering.
- **Replay & Idempotency Safeguards:** Unique indices `uq_dine_in_orders_customer_idempotency` and `uq_reservation_pre_orders_reservation` protect against duplicate submissions.
- **SQL Injection Defense:** All queries across menu, cart, dine-in, pre-order, and kitchen tables use parameterized ADO.NET SQL commands via `MySqlConnector`. String interpolation in SQL commands is strictly disallowed.
- **Asset Upload Sanitization:** Image uploads are restricted to 5MB and validated against strict MIME types and file extensions, with sanitized filenames preventing path traversal.

### Testing

The Sprint 3 implementation is verified by automated test suites across backend and frontend repositories:
- **Reservation Service Unit Tests (`reservation-service-tests`):** **231 tests passing** (`dotnet test`). Covers:
  - Menu item request validators (`MenuItemCreateRequestValidator`, `MenuItemUpdateRequestValidator`).
  - Cart addition, quantity updates, price calculations, and customer isolation.
  - Dine-in order creation, table availability checks, and idempotency key handling.
  - Reservation pre-order validation, eligibility constraints, and duplicate rejection.
  - Kitchen queue sorting, wait duration calculations, and state machine transition validation.
  - Outbox publisher routing logic and SR-278 order lifecycle topic resolution.
- **Identity Service Unit Tests (`identity-service-tests`):** **31 tests passing** (`dotnet test`). Covers authentication, registration, token generation, and role authorization policies.
- **Frontend Unit & Component Tests (`restaurant-web`):** **147 tests passing** (`npm test`). Covers:
  - Menu category filtering, dietary preference selection, and search debouncing.
  - Cart line-item increment, decrement, removal, and subtotal calculation.
  - Order review validation and dine-in submission workflows.
  - Kitchen queue card rendering, urgency timer calculation, and status progression buttons.
  - Role-based route protection and post-login redirection logic.

### Sprint 3 Outcome

Sprint 3 successfully transitions Cinnamon Bistro from a table reservation system into a fully operational end-to-end dining management platform. Customers enjoy a luxurious, responsive experience for browsing menus, staging carts, placing dine-in orders or reservation-linked pre-orders, and tracking preparation in real time. Kitchen staff benefit from a prioritized, concurrency-safe digital display queue. The platform guarantees transactional data integrity, server-authoritative pricing, and seamless event-driven integration through Apache Kafka, providing a hardened foundation for Sprint 4 billing and payment integration.

---

### API Endpoints Added in Sprint 3

| Method | Endpoint | Authorization | Description |
| --- | --- | --- | --- |
| `GET` | `/api/menu-items` | Public / Customer | Retrieves all active menu items (`IsAvailable = 1`) with optional category and dietary filters (SR-131). |
| `GET` | `/api/menu-items/admin` | Admin | Retrieves all menu items including inactive dishes for administrative management (SR-130). |
| `GET` | `/api/menu-items/{id}` | Public / Authenticated | Retrieves detailed information for a single menu item (SR-130). |
| `POST` | `/api/menu-items` | Admin | Creates a new menu item with multipart/form-data image upload and validation (SR-130). |
| `PUT` | `/api/menu-items/{id}` | Admin | Updates menu item details, pricing, categories, dietary flags, and optional image (SR-130). |
| `PATCH` | `/api/menu-items/{id}/availability` | Admin | Toggles menu item availability (`IsAvailable`) instantaneously (SR-130). |
| `GET` | `/api/cart` | Customer | Retrieves the authenticated customer's active cart with server-calculated totals (SR-132). |
| `POST` | `/api/cart/items` | Customer | Adds an item to the customer's cart with server-authoritative unit price (SR-132). |
| `PUT` | `/api/cart/items/{itemId}` | Customer | Updates line-item quantity in the active cart (SR-132). |
| `DELETE` | `/api/cart/items/{itemId}` | Customer | Removes a specific line item from the cart (SR-132). |
| `DELETE` | `/api/cart` | Customer | Clears all items from the customer's active cart (SR-132). |
| `POST` | `/api/orders/dine-in` | Customer | Places an atomic dine-in order for a physical table under idempotency protection (SR-133). |
| `POST` | `/api/orders/reservation-pre-order` | Customer | Places a pre-order linked to an eligible upcoming reservation (SR-134). |
| `GET` | `/api/orders/reservation-pre-order/{reservationId}` | Customer | Retrieves pre-order details associated with a specific reservation (SR-134). |
| `GET` | `/api/orders/my-orders` | Customer | Returns unified order history across dine-in and pre-orders for the authenticated user (SR-135). |
| `GET` | `/api/orders/{orderReference}/status` | Customer | Checks real-time preparation status and milestone timestamps for a specific order (SR-135). |
| `GET` | `/api/kitchen/queue` | KitchenStaff, Admin | Retrieves active kitchen queue orders (`Pending`, `Preparing`) sorted by FIFO and urgency (SR-136). |
| `PATCH` | `/api/kitchen/orders/{orderReference}/status` | KitchenStaff, Admin | Updates kitchen order status (`Preparing`, `Ready`, `Served`) under pessimistic row lock (SR-137). |

---

### Database Schema & Migrations (Sprint 3)

Sprint 3 database tables and constraints are managed via idempotent SQL migration scripts in `database/reservation-db/`:

| Migration Script | Scope & Changes Implemented |
| --- | --- |
| `03_menu_items.sql` | Creates `MenuItems` table (`Id`, `Name`, `Description`, `Category`, `Price`, `IsAvailable`, `DietaryPreferences`, `ImageReference`, `CreatedAt`, `UpdatedAt`), check constraint `chk_menu_items_price (Price > 0)`, and composite index `idx_menu_items_category (Category, IsAvailable)`. |
| `07_order_cart.sql` | Creates `OrderCarts` table (`Id`, `CustomerId`, `CreatedAt`, `UpdatedAt`) with unique constraint `uq_order_carts_customer (CustomerId)`, and `OrderCartItems` table (`Id`, `CartId`, `MenuItemId`, `Quantity`, `UnitPrice`, `SpecialInstructions`, `CreatedAt`, `UpdatedAt`) with foreign keys and check constraint `chk_order_cart_items_qty (Quantity > 0)`. |
| `08_dine_in_orders.sql` | Creates `DineInOrders` table (`Id`, `OrderReference`, `CustomerId`, `TableId`, `Status`, `TotalAmount`, `SpecialInstructions`, `IdempotencyKey`, `CreatedAt`, `UpdatedAt`, `PreparingStartedAt`, `ReadyAt`, `ServedAt`), unique index `uq_dine_in_orders_ref`, unique index `uq_dine_in_orders_customer_idempotency`, and line-item table `DineInOrderItems`. |
| `09_reservation_pre_orders.sql` | Creates `ReservationPreOrders` table (`Id`, `OrderReference`, `CustomerId`, `ReservationId`, `Status`, `TotalAmount`, `SpecialInstructions`, `CreatedAt`, `UpdatedAt`, `PreparingStartedAt`, `ReadyAt`, `ServedAt`), unique index `uq_reservation_pre_orders_ref`, unique index `uq_reservation_pre_orders_reservation`, and line-item table `ReservationPreOrderItems`. |
| `10_order_lifecycle_events.sql` | Configures outbox routing and index support for `OrderLifecycleEvent` types (`OrderCreated`, `OrderPreparing`, `OrderReady`, `OrderServed`, `OrderCancelled`) targeting Kafka topic `order-lifecycle-events`. |

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

The Cinnamon Bistro platform leverages modern enterprise-grade technologies across frontend, backend microservices, data persistence, event streaming, reporting, payment processing, and container infrastructure:

| Architectural Tier | Technology / Library | Version | Role in Cinnamon Bistro |
| --- | --- | --- | --- |
| **Frontend Framework** | React | 19.x | Component-based interactive user interface and reactive state management |
| **Frontend Build Tool** | Vite | 5.x / 6.x | Lightning-fast ES modules development server and optimized production bundler |
| **Client Routing** | React Router DOM | 7.x | Declarative client-side routing, protected role-based guards, and redirection |
| **HTTP Client** | Axios | Latest | Promise-based API communication with JWT Bearer injection & 401/403 session interceptors |
| **Spreadsheet Generation (Frontend)** | `exceljs` | 4.4.0 | Client-side Excel workbook creation, column dimensioning, and Blob file export |
| **PDF Report Generation (Frontend)** | `jspdf` | 4.2.1 | Client-side vector PDF document rendering for administrative audit reports |
| **PDF Tabular Layout Engine** | `jspdf-autotable` | 5.0.8 | Structured multi-page PDF tables with custom cell padding, borders, and auto-wrapping |
| **Invoice / Receipt Print Engine** | Native Iframe + `@media print` | Browser Native | Sandboxed off-screen DOM print rendering for printable customer tax invoices and slips |
| **Analytics & Data Visualization** | Recharts | Latest | Composable SVG charts for administrative sales analytics and table occupancy trends |
| **Iconography** | Lucide React | Latest | Lightweight, accessible iconography across customer and staff interfaces |
| **Styling & Design System** | Custom CSS3 & CSS Variables | Modern Web | Luxury Boutique Design System featuring Playfair Display, Montserrat, and 6px gold scrollbars |
| **Backend Framework** | ASP.NET Core Web API | .NET 10 (`net10.0`) | High-performance RESTful microservices architecture and dependency injection |
| **Language & Runtime** | C# | 12 / 13 | Modern type-safe programming language with asynchronous task execution (`async/await`) |
| **Spreadsheet Generation (Backend)** | `ClosedXML` (`ClosedXML.Excel`) | 0.105.0 | Server-side styled Excel (.xlsx) workbook generation with charcoal/gold branding & auto-fit |
| **CSV Generation Engine** | Custom UTF-8 BOM Stream | Internal | Fast streaming CSV generator with formula injection defense (`=, +, -, @` neutralization) |
| **Relational Database** | MySQL Community Server | 8.0 | Primary relational datastore with ACID compliance and InnoDB storage engine |
| **Data Access Layer** | ADO.NET (`MySqlConnector`) | 2.4.0 | Direct high-throughput parameterized SQL execution with zero ORM overhead |
| **Concurrency Control** | InnoDB Row-Level Locks | `SELECT ... FOR UPDATE` | Pessimistic locking preventing table double-booking and serializing kitchen transitions |
| **Event Streaming Backbone** | Apache Kafka | 3.9 (KRaft mode) | Distributed event streaming log operating without ZooKeeper dependencies |
| **Kafka .NET Client** | `Confluent.Kafka` | 2.6.1 | High-throughput asynchronous Kafka producer with retry and acknowledgment semantics |
| **Event Outbox Architecture** | Transactional Outbox Pattern | Custom SQL + Worker | Atomic local database transaction staging with background polling publisher |
| **Payment Gateway** | PayHere Sandbox Gateway | REST + IPN | Digital payment processing with MD5 cryptographic signature verification |
| **Authentication & Tokens** | JWT (`JwtBearer`) | 8.0.13 | Stateless authentication using HMAC-SHA256 signatures and role claims |
| **Password Security** | `BCrypt.Net-Next` | Latest | Adaptive work-factor cryptographic password hashing |
| **Email Deliverability Verification** | `DisposableEmailValidator` | Internal | DNS MX record inspection and disposable email domain blacklist enforcement |
| **API Documentation** | Swagger / OpenAPI (`Swashbuckle`) | 6.6.2 | Interactive API explorer and contract definition in Development mode |
| **Observability & Metrics** | `prometheus-net.AspNetCore` | 8.2.1 | Prometheus metrics collection middleware exposing `/metrics` operational endpoints |
| **Container Hosting** | Docker & Multi-Stage Dockerfiles | Alpine / Debian | Lightweight container packaging for Node build stages, Nginx web server, and .NET runtime |
| **Local Orchestration** | Docker Compose | Compose v2 | Local multi-service orchestration (`mysql`, `kafka`, `identity`, `reservation`, `frontend`) |
| **Web Server & Reverse Proxy** | Nginx | 1.25+ Alpine | Reverse proxy, static React hosting, SSL offloading, and 5MB upload size tuning |
| **CI/CD Pipeline** | GitHub Actions | Workflows | Automated CI build validation, linting, and 770+ automated unit tests on every pull request |
| **Cloud Hosting Target** | Microsoft Azure | Cloud | Azure Container Apps, Azure Blob Storage (menu assets), Azure Managed MySQL, and ACR |

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

### Sprint 3 Summary (Completed Work Items)

| Jira Key | Work Item Summary | Status |
| --- | --- | --- |
| SR-130 | Manage Menu Items, Prices and Availability | Done |
| SR-131 | Browse the Menu and Filter by Category or Dietary Preference | Done |
| SR-132 | Add, Update and Remove Items in the Order Cart | Done |
| SR-133 | Place a Dine-in Order for a Restaurant Table | Done |
| SR-134 | Place a Pre-Order Linked to a Reservation | Done |
| SR-135 | Track Order Status and View Customer Order History | Done |
| SR-136 | Display Incoming Orders in the Kitchen Queue | Done |
| SR-137 | Update Kitchen Order Status from Pending to Preparing and Ready | Done |
| SR-138 | Publish Order Lifecycle Events through Kafka | Done |
| SR-211 | UI/UX Harmonization & Luxury Boutique Styling | Done |
| SR-278 | Fix OrderCreated Kafka Lifecycle Event Topic Routing | Done |


### Sprint 4 Summary (Completed Work Items)

| Jira Key | Work Item Summary | Status |
| --- | --- | --- |
| SR-280 | PayHere Payment Gateway Integration & Pre-Pay Dining Model | Done |
| SR-218 | Centralized User and Staff Management Dashboard | Done |
| SR-219 | Customer Feedback Submission, Ratings and Admin Reply Moderation | Done |
| SR-220 | Real-Time and Stored Customer Dining & Order Notification Center | Done |
| SR-221 | Administrative Operational Analytics and Real-Time Restaurant KPIs | Done |
| SR-222 | Advanced Reservation and Order Search Engine with Multi-Criteria Filtering | Done |
| SR-223 | Comprehensive Administrative Security Audit Logging and Activity Tracking | Done |
| SR-224 | Customer Profile Self-Service Management and Password Change Security | Done |
| SR-225 | Authentication Hardening, Role Boundary Enforcement and Session Defense | Done |
| SR-248 | Executive Styled Excel (.xlsx) and Injection-Neutralized CSV Export | Done |
| SR-294 | UI Consistency and Cross-Viewport Responsiveness Across Cinnamon Bistro | Done |
| SR-296 | Disposable Email Domain Defense and Email Deliverability Verification | Done |

---

## System Release & Deployment Readiness

With all four development sprints successfully completed, Cinnamon Bistro has achieved full feature parity, comprehensive security hardening, enterprise test coverage, and cloud deployment readiness:

1. **End-to-End Operational Lifecycle:** Complete guest dining journey—from landing page atmosphere showcase and table availability reservation, through dietary-filtered menu browsing, persistent cart staging, table-side dine-in and pre-ordering, PayHere sandbox payments, real-time kitchen display queue management (KDS), to customer dining feedback and executive reporting.
2. **Security & Governance:** JWT-secured microservices, BCrypt password hashing, role-based access control (Admin, Customer, KitchenStaff), disposable email registration guards, locked email identities, administrative user status controls (Active, Blocked, Deactivated), and tamper-evident audit logging.
3. **High-Performance Architecture:** Optimistic and pessimistic database row-level locking (`SELECT ... FOR UPDATE`), Transactional Outbox pattern with Apache Kafka event streaming, and automated background workers for unpaid order expiration.
4. **Cloud Infrastructure & CI/CD:** Fully containerized Docker microservices, automated multi-stage GitHub Actions CI testing, and Azure Container Apps continuous delivery pipelines.

---

## Team

| Team member | Student ID | Sprint 1 role | Sprint 2 role | Sprint 3 role | Sprint 4 role |
| --- | --- | --- | --- | --- | --- |
| D.M.N. Pesanjith | IT24101505 | Business Analytics / Project Management | DevOps | Developer | QA Engineer |
| H. L. P. S. Perera | IT24101848 | QA Engineer | Developer | DevOps | Business Analytics |
| H.R.M.A.A. Bandara | IT24100315 | Developer | Business Analytics | QA Engineer | DevOps |
| Wijesinghe K. | IT24102587 | DevOps | QA Engineer | Business Analytics | Developer |

---

## Repository / Contribution Workflow

Git history follows feature branch workflows merged into integration branches through pull requests:
- Create scoped feature branches (`feature/SR-XX-description`) off `develop`.
- Submit PRs into `develop` with completed pull request templates, user story references, and technical descriptions.
- Code merges require passing CI workflows (build checks and unit tests).
- Pushes to `develop` automatically trigger the continuous deployment pipeline to Azure Container Apps.
