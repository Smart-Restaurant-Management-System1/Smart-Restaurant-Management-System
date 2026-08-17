# Docker Setup Plan

Each ASP.NET microservice should receive its own Dockerfile when implementation begins.
The React frontend may also be containerized.
A root docker-compose.yml can later coordinate:
- frontend
- identity-service
- reservation-service
- order-service
- billing-report-service
- MySQL databases
- Prometheus
- Grafana

Docker implementation files are intentionally not pre-generated.
