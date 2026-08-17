# ASP.NET Backend Microservices

Create each service as an ASP.NET Core Web API project.

Recommended NuGet packages:
- MySqlConnector — ADO.NET-compatible MySQL driver
- Microsoft.AspNetCore.Authentication.JwtBearer — JWT authentication
- Swashbuckle.AspNetCore — Swagger/OpenAPI
- BCrypt.Net-Next — password hashing (mainly Identity Service)
- Serilog.AspNetCore — structured logging
- prometheus-net.AspNetCore — Prometheus metrics

Testing:
- Microsoft.NET.Test.Sdk
- xunit
- xunit.runner.visualstudio
- coverlet.collector

Important: Database operations should use ADO.NET/direct SQL as required by the assignment. Do not use Entity Framework as the data-access replacement.
