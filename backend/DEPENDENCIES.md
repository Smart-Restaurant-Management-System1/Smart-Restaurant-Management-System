# Backend Dependency Setup

Run these after creating each ASP.NET Core Web API project.

## Common packages
```bash
dotnet add package MySqlConnector
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Swashbuckle.AspNetCore
dotnet add package Serilog.AspNetCore
dotnet add package prometheus-net.AspNetCore
```

## Identity Service additional package
```bash
dotnet add package BCrypt.Net-Next
```

## Test project packages
```bash
dotnet add package Microsoft.NET.Test.Sdk
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package coverlet.collector
```

Use package versions compatible with the .NET SDK selected by the team.
