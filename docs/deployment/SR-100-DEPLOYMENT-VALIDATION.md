# SR-100 — Deploy and Validate the Sprint 2 Reservation Workflow

## 1. Purpose

This document records the deployment preparation and validation activities for SR-100, "Deploy and Validate the Sprint 2 Reservation Workflow".

The objective is to make sure that the completed Sprint 2 Reservation workflow can be safely validated through the existing GitHub Actions and Azure environment.

The scope of this work is limited to the Reservation workflow and the React frontend required to access it. Order, Billing, and Report services are not considered completed as part of this deployment validation.

The existing project infrastructure includes:

- GitHub repository for source control
- GitHub Actions for CI/CD
- Azure Container Registry (ACR)
- Azure Container Apps
- Azure Database for MySQL Flexible Server
- Azure Log Analytics
- Azure Managed Identity and GitHub Actions OIDC authentication

Docker-based image building and Container App deployment are part of the existing delivery architecture, but those activities are not executed locally as part of this implementation because Docker is not available in the current development environment.


## 2. SR-100 Scope

The following activities are included in this validation:

1. Verify the CI pipeline builds the frontend and backend projects.
2. Verify automated tests are executed before deployment.
3. Verify the existing Azure OIDC configuration.
4. Review the Reservation database migration and rollback process.
5. Define secure configuration requirements for the deployed application.
6. Define Reservation API and frontend health validation.
7. Define post-deployment smoke tests.
8. Define log inspection and failure diagnosis procedures.
9. Define rollback procedures.
10. Record deployment evidence.
11. Explicitly exclude incomplete Order, Billing, and Report functionality from the deployment claim.

Docker image creation, Docker image publishing and Container App image deployment are treated as Docker-dependent activities and are not claimed as completed in this implementation.


## 3. Existing Azure Environment

The existing development environment is located in the Azure resource group:

`rg-cinnamon-bistro-dev`

The relevant resources are:

- Azure Container Registry: `acrcinnamonbistrodev`
- Container Apps Environment: `cae-cinnamon-bistro-dev`
- Frontend Container App: `frontend-web`
- Identity Container App: `identity-api`
- Reservation Container App: `reservation-api`
- Managed Identity: `id-cinnamon-bistro-acr`
- MySQL Flexible Server: `mysql-cinnamon-bistro-dev`
- Log Analytics Workspace: `workspace-rgcinnamonbistrodevnTdS`

These resources were already created as part of the project's previous deployment setup and are reused for SR-100.


## 4. CI Verification

The GitHub Actions CI workflow is configured to run when changes are pushed to the `main` or `develop` branches and when pull requests target those branches.

The CI pipeline contains the following validation jobs:

- Repository Validation
- React Frontend
- ASP.NET Core Backend
- xUnit Tests
- Kafka Integration Tests

A successful GitHub Actions run was verified on the `develop` branch.

The successful run included:

- Repository Validation — Passed
- React Frontend — Passed
- ASP.NET Core Backend — Passed
- xUnit Tests — Passed
- SR-114 Kafka Integration Tests — Passed

This confirms that the existing CI pipeline can successfully execute the project's automated validation before deployment.

Evidence for this verification is recorded separately as:

`SR-100-CI-Success.png`


## 5. Database Migration Strategy

The Reservation database migrations are stored under:

`database/reservation-db/`

The current migration sequence is:

1. `01_init_reservation.sql`
2. `02_reservations.sql`
3. `03_reservation_creation.sql`
4. `04_reservation_lifecycle.sql`
5. `05_reservation_concurrency.sql`
6. `06_reservation_outbox.sql`

The migrations progressively introduce the Reservation database structure, reservation records, reservation creation support, reservation lifecycle handling, concurrency-related indexes, and the Reservation Outbox.

Migrations must be applied in numerical order.

Before applying migrations to the shared Azure database:

1. Confirm that the target database is the intended Reservation database.
2. Confirm that the migration files being applied are the reviewed versions stored in the repository.
3. Confirm that a database backup or recovery option is available.
4. Apply migrations sequentially.
5. Check the result of each migration before continuing.
6. Verify the expected tables, columns, indexes and constraints after migration.
7. Record the migration version and execution result as deployment evidence.


## 6. Database Rollback Procedure

Database rollback must be treated carefully because some migrations modify structures that may already contain Sprint 2 data.

The migration files contain rollback guidance for individual changes.

### Migration 01

`01_init_reservation.sql`

This migration creates the Reservation database and initial restaurant table data.

Rollback should only be performed when it is confirmed that the database can safely be removed or recreated without affecting required data.

### Migration 02

`02_reservations.sql`

This migration creates the `Reservations` table and related indexes and constraints.

Rollback should only be performed after confirming that reservation data is not required.

### Migration 03

`03_reservation_creation.sql`

This migration adds Reservation creation functionality, including customer and booking-related fields and indexes.

The migration documentation indicates that the shared database should not simply be dropped when reservation data exists. A backup or controlled restoration process should be used instead.

### Migration 04

`04_reservation_lifecycle.sql`

This migration updates the reservation status constraint and introduces the lifecycle values:

- Pending
- Confirmed
- Cancelled
- Completed

Rollback must only be performed after confirming that existing records do not contain lifecycle values that would be invalid under the previous constraint.

### Migration 05

`05_reservation_concurrency.sql`

This migration ensures the required Reservation concurrency index exists.

Rollback should only be performed after confirming that the index is not required by the deployed Reservation workflow.

### Migration 06

`06_reservation_outbox.sql`

This migration creates the `ReservationOutbox` table and supporting indexes and constraints.

The migration documentation indicates that the outbox table should only be removed after confirming that pending or processing events are not required. Processed records may need to be archived before removing the table.

### General rollback rule

A database rollback must not be performed blindly on the shared development database.

The recommended sequence is:

1. Stop or prevent application traffic that could modify affected data.
2. Confirm the migration that needs to be rolled back.
3. Check whether application data depends on the migration.
4. Create or verify a recoverable backup.
5. Perform the controlled rollback.
6. Verify database structure.
7. Verify Reservation API functionality.
8. Record the result.

If data has already been created using the new schema, restoring the database from a verified backup may be safer than reversing schema changes manually.


## 7. Secure Configuration

Environment-specific configuration must not be committed to the Git repository.

The application requires configuration such as:

- Database connection information
- JWT configuration
- Authentication-related configuration
- Environment-specific application settings

Sensitive values must be supplied through the approved deployment configuration or secret storage mechanism.

The following must not be included in source control:

- Database passwords
- JWT secrets
- Azure credentials
- Access tokens
- Connection strings containing passwords
- Other production or shared-environment secrets

Example configuration files may contain placeholders, but actual secret values must remain outside the repository.

When deployment configuration is inspected for evidence, only variable names or redacted values should be captured.


## 8. Azure OIDC Verification

The existing GitHub Actions deployment architecture uses OpenID Connect (OIDC) to authenticate GitHub Actions with Azure.

The existing managed identity is:

`id-cinnamon-bistro-acr`

The managed identity has an existing federated credential named:

`github-develop-cd`

The federated credential uses the GitHub Actions OIDC issuer.

This provides the required federation between GitHub Actions and Azure without storing a long-lived Azure password in the GitHub repository.

The existing GitHub Actions deployment workflow contains:

- `id-token: write` permission
- Azure Login using OIDC
- Azure subscription identification
- Azure tenant identification
- Azure managed identity client identification

No Azure password is required by the OIDC authentication mechanism.


## 9. Container Registry Verification

The existing Azure Container Registry is:

`acrcinnamonbistrodev`

The registry contains repositories for the deployed application components, including:

- `frontend`
- `identity-service`
- `reservation-service`

The Reservation Service repository contains multiple versioned tags in addition to the `latest` tag.

The existing repository therefore provides evidence that versioned Reservation Service images have previously been published to ACR.

Docker image creation and publishing are not executed locally as part of this SR-100 implementation.


## 10. Reservation API Health Validation

The Reservation API is deployed as the Azure Container App:

`reservation-api`

The application has an Azure Container Apps URL configured.

Health validation should verify:

1. The Reservation API revision is running.
2. The health endpoint responds successfully.
3. The API can connect to the Reservation MySQL database.
4. Database-dependent endpoints respond correctly.
5. No application startup errors are present in the logs.

A healthy result should demonstrate both application availability and database connectivity.

A health check should not be considered successful solely because the Container App exists.


## 11. Frontend Health Validation

The frontend Container App is:

`frontend-web`

The frontend validation should confirm:

1. The public frontend loads successfully.
2. Static resources load without errors.
3. The frontend can communicate with the required backend API.
4. Authentication requests reach the Identity service.
5. Reservation requests reach the Reservation service.
6. No browser-side configuration exposes secrets.

The frontend should be tested from the public application URL after the backend services are available.


## 12. Post-Deployment Smoke Test

The following smoke-test sequence should be performed after a successful deployment.

### Test 1 — Open frontend

Expected result:

- Public frontend loads successfully.
- No blocking frontend errors are displayed.

### Test 2 — User login

Expected result:

- User can enter valid credentials.
- Identity authentication succeeds.
- A valid authenticated session/token is established.

### Test 3 — View available tables

Expected result:

- Reservation workflow can retrieve active restaurant tables.
- Table information and seating capacity are displayed correctly.

### Test 4 — Search availability

Expected result:

- Availability can be searched using the required reservation details.
- Available tables are returned correctly.

### Test 5 — Create reservation

Expected result:

- An authenticated customer can create a valid reservation.
- The booking confirmation is displayed.
- The reservation is stored successfully.

### Test 6 — Customer reservation history

Expected result:

- The authenticated customer can view their reservation history.
- Previously created reservation information is displayed.

### Test 7 — Reservation administration

Expected result:

- An authorized administrator can access the appropriate reservation management functionality.
- Unauthorized users cannot access administrator-only functionality.

### Test 8 — Database connectivity

Expected result:

- Reservation operations complete successfully.
- No database connection errors are generated.

All smoke-test results should be recorded with screenshots or other suitable evidence.


## 13. Logging and Failure Diagnosis

Azure Container Apps uses the existing Azure monitoring and Log Analytics environment for application diagnostics.

The relevant Log Analytics workspace is:

`workspace-rgcinnamonbistrodevnTdS`

When a deployment or health check fails, the following should be checked:

1. Container App revision status.
2. Replica status.
3. Container startup logs.
4. Application errors.
5. Database connection errors.
6. Authentication errors.
7. HTTP request failures.
8. Configuration errors.

Logs must be checked for sensitive information before screenshots are included in the report.

Passwords, access tokens, JWT secrets and complete connection strings must not be included in evidence screenshots.


## 14. Rollback Procedure

Application rollback should use the previously verified stable image/revision.

The general rollback sequence is:

1. Identify the failed or unstable revision.
2. Identify the last known stable revision or image tag.
3. Verify that the stable version corresponds to a previously tested build.
4. Restore the stable application revision/image.
5. Verify that the Reservation API starts successfully.
6. Verify database connectivity.
7. Run the basic smoke tests again.
8. Confirm that the public frontend and Reservation workflow are functional.
9. Record the rollback result.

The `latest` tag should not be used as the only rollback reference because a version-specific image tag provides a more reliable reference to a particular build.

Versioned commit-based image tags already exist in the Reservation Service ACR repository.


## 15. Current Deployment Blocker

At the time of SR-100 validation, the existing Azure MySQL Flexible Server experienced an Azure resource provisioning failure during a restart/start operation.

The affected server is:

`mysql-cinnamon-bistro-dev`

The Azure Activity Log reported:

`ResourceOperationFailure`

with the message:

`The resource operation completed with terminal provisioning state 'Failed'.`

Because the Reservation Service depends on this database, complete end-to-end health validation cannot be claimed while the database infrastructure is unavailable.

No replacement database was created as part of this work because the existing team database is the intended shared environment.

No destructive database recovery operation was performed.


## 16. Docker-Dependent Activities

The following SR-100 activities require Docker/container deployment and are therefore not claimed as locally completed in this implementation:

- Building new Docker images locally.
- Publishing newly built Docker images to ACR.
- Deploying newly built images to Azure Container Apps.

These activities are part of the existing GitHub Actions/Azure deployment architecture, but they require the container build and deployment environment.

The existing CI pipeline was independently verified successfully, and existing ACR repositories, versioned Reservation Service images, Azure Container Apps and OIDC configuration were verified.

This distinction is intentional so that the deployment report does not claim an activity that was not actually executed.


## 17. Evidence to Record

The following evidence should be included in the final SR-100 submission where applicable:

| Evidence | Purpose |
|---|---|
| GitHub Actions successful CI run | Demonstrates automated build/test validation |
| CI job results | Demonstrates frontend, backend and test jobs passed |
| ACR Reservation Service repository | Demonstrates existing versioned images |
| ACR versioned tags | Demonstrates traceable application versions |
| Azure Managed Identity | Demonstrates existing Azure identity configuration |
| Federated credential | Demonstrates GitHub Actions OIDC configuration |
| Azure Resource Group | Demonstrates existing deployment environment |
| Reservation API overview | Demonstrates the Azure Container App resource |
| Reservation API revision information | Demonstrates revision-based deployment model |
| MySQL configuration | Demonstrates the intended database environment |
| Database migration files | Demonstrates controlled schema changes |
| Health-check results | Demonstrates application/database validation |
| Smoke-test results | Demonstrates end-to-end Reservation workflow |
| Azure logs | Demonstrates failure diagnosis capability |
| Rollback evidence | Demonstrates recovery procedure |


## 18. Scope Boundary

SR-100 only claims validation of the Sprint 2 Reservation workflow and the required frontend integration.

The following services are not claimed as completed through this deployment validation:

- Order Service
- Billing Service
- Report Service

These services remain outside the completed scope unless separately delivered and verified.


## 19. Final Status

### Completed / Verified

- Existing GitHub Actions CI pipeline verified successfully.
- Frontend build validation verified through CI.
- Backend build validation verified through CI.
- Automated test execution verified through CI.
- Existing Azure resource group verified.
- Existing Azure Container Registry verified.
- Existing Reservation Service repository and versioned image tags verified.
- Existing Azure Managed Identity verified.
- Existing GitHub Actions OIDC federated credential verified.
- Reservation database migration sequence reviewed.
- Database rollback considerations documented.
- Secure configuration requirements documented.
- Health-check procedure documented.
- Post-deployment smoke-test procedure documented.
- Logging and failure-diagnosis procedure documented.
- Application rollback procedure documented.
- Deployment evidence requirements documented.

### Not Claimed as Completed

- Local Docker image building.
- New Docker image publishing from the current environment.
- New Container App deployment using newly built Docker images.
- End-to-end production-style validation while the required MySQL service is unavailable.

### Current Blocker

The Azure MySQL Flexible Server currently has a provisioning failure. Since the Reservation Service depends on this database, final database connectivity and complete end-to-end smoke testing must be performed after the existing database infrastructure becomes available again.

No replacement infrastructure or destructive recovery action was performed.


## 20. Conclusion

The SR-100 deployment process has been prepared around the existing GitHub Actions and Azure architecture.

The CI pipeline has been successfully verified, the existing Azure resources and OIDC configuration have been checked, and the Reservation database migration, rollback, health-check, smoke-test, logging and recovery procedures have been documented.

The remaining deployment activities that depend on Docker and the availability of the Azure MySQL service are not falsely marked as complete.

This provides a controlled and traceable deployment process while keeping the scope limited to the Sprint 2 Reservation workflow.