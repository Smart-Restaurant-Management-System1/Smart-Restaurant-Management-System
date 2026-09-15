# Docker Setup Guide

This project uses Docker and Docker Compose to run the Smart Restaurant Management System locally in a containerized environment.

## Current Containerized Services

The root `docker-compose.yml` currently coordinates the following services:

- React frontend served through Nginx
- Identity microservice (.NET)
- Reservation microservice (.NET)
- MySQL 8.0 database
- Apache Kafka broker running in KRaft mode

Additional services such as order, billing/reporting, Prometheus, and Grafana can be added as their implementations are integrated.

## Prerequisites

Install the following before starting the project:

- Docker Desktop
- Git
- A modern web browser

Docker Desktop must be running before executing Docker Compose commands.

## Environment Configuration

The project uses a local `.env` file for Docker Compose configuration.

Create it from the provided template:

```powershell
Copy-Item .env.example .env
```

Update the local `.env` values as required.

Do not commit the `.env` file because it contains local development configuration and sensitive values.

## Build and Start the Stack

Build and start the services:

```powershell
docker compose up --build
```

For detached/background mode:

```powershell
docker compose up -d
```

## Stop the Stack

```powershell
docker compose down
```

Do not use `docker compose down -v` unless the local database data should also be deleted.

## Verify Container Status

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected services:

- `smart_restaurant_frontend`
- `smart_restaurant_identity_service`
- `smart_restaurant_reservation_service`
- `smart_restaurant_mysql`
- `smart_restaurant_kafka`

MySQL and Kafka should report a healthy status.

## Local Endpoints

- Frontend: `http://localhost`
- Identity Service Swagger: `http://localhost:5001/swagger/index.html`
- Reservation Service Swagger: `http://localhost:5000/swagger/index.html`
- MySQL host port: `3307`
- Kafka host port: `9092`

## MySQL Readiness Handling

The Docker Compose configuration uses a MySQL health check to ensure the final MySQL server process is ready before dependent services start.

The Identity and Reservation services wait for MySQL to become healthy.

The Reservation service also waits for Kafka to become healthy.

## Kafka Configuration

Kafka runs in KRaft mode without Zookeeper.

The local broker is available inside the Docker network at:

```text
kafka:9092
```

Reservation lifecycle events are published to:

```text
restaurant.reservations.v1
```

## CI Integration

GitHub Actions performs:

- Repository validation
- Frontend build
- Backend build
- Unit testing
- MySQL integration testing
- Kafka integration testing

The Kafka integration test environment uses:

```text
SR101_TEST_MYSQL
SR101_TEST_KAFKA
```

This enables real Kafka end-to-end integration testing in CI.

## CD Configuration

The Azure deployment workflow uses GitHub Actions secrets and repository variables instead of hard-coded deployment identifiers.

Required repository secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Required repository variables:

- `ACR_NAME`
- `ACR_LOGIN_SERVER`
- `AZURE_RESOURCE_GROUP`

The CD workflow builds Docker images, pushes them to Azure Container Registry, and updates Azure Container Apps.

## Troubleshooting

View container logs:

```powershell
docker logs <container-name>
```

Example:

```powershell
docker logs smart_restaurant_reservation_service
```

Check recent errors:

```powershell
docker logs smart_restaurant_reservation_service --since 2m 2>&1 | Select-String "fail|error|exception"
```

Validate Docker Compose configuration:

```powershell
docker compose config
```