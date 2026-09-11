# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["identity-service.csproj", "./"]
RUN dotnet restore "identity-service.csproj"

COPY . .
RUN dotnet publish "identity-service.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5001
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5001

ENTRYPOINT ["dotnet", "identity-service.dll"]
