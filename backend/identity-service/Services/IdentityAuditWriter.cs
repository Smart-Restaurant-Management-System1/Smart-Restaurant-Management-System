using System.Text.Json;
using System.Text.RegularExpressions;
using IdentityService.Data;
using MySqlConnector;

namespace IdentityService.Services;

/// <summary>
/// Authoritative writer for user management audit trails in Identity Service (SR-223 / SR-251).
/// Writes append-only logs directly to the centralized AdminAuditLogs table in MySQL.
/// </summary>
public class IdentityAuditWriter : IIdentityAuditWriter
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly string _reservationDbName;
    private readonly ILogger<IdentityAuditWriter> _logger;

    public IdentityAuditWriter(DatabaseHelper databaseHelper, IConfiguration configuration, ILogger<IdentityAuditWriter> logger)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;

        var rawDbName = configuration["ReservationDb:DatabaseName"]
            ?? configuration["RESERVATION_DB_NAME"]
            ?? "restaurant_reservation_db";

        _reservationDbName = Regex.Replace(rawDbName, @"[^\w]", "");
        if (string.IsNullOrWhiteSpace(_reservationDbName))
        {
            _reservationDbName = "restaurant_reservation_db";
        }
    }

    public async Task LogActionAsync(
        string actionType,
        int adminId,
        string adminEmail,
        string targetType,
        string? targetId = null,
        string result = "Success",
        object? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var sanitizedDetails = SanitizeDetails(details);

        var sql = $"""
            INSERT INTO `{_reservationDbName}`.`AdminAuditLogs` (
                TimestampUtc, ActionType, AdminId, AdminEmail, AdminRole,
                TargetType, TargetId, Result, DetailsJson, SourceService, IpAddress
            ) VALUES (
                UTC_TIMESTAMP(), @ActionType, @AdminId, @AdminEmail, 'Admin',
                @TargetType, @TargetId, @Result, @DetailsJson, 'IdentityService', @IpAddress
            );
            """;

        try
        {
            await using var connection = await _databaseHelper.CreateConnectionAsync();
            await using var command = new MySqlCommand(sql, connection);

            command.Parameters.AddWithValue("@ActionType", actionType);
            command.Parameters.AddWithValue("@AdminId", adminId);
            command.Parameters.AddWithValue("@AdminEmail", adminEmail);
            command.Parameters.AddWithValue("@TargetType", targetType);
            command.Parameters.AddWithValue("@TargetId", (object?)targetId ?? DBNull.Value);
            command.Parameters.AddWithValue("@Result", result);
            command.Parameters.AddWithValue("@DetailsJson", (object?)sanitizedDetails ?? DBNull.Value);
            command.Parameters.AddWithValue("@IpAddress", (object?)ipAddress ?? DBNull.Value);

            await command.ExecuteNonQueryAsync(cancellationToken);
            _logger.LogInformation("Identity AuditLog recorded: {ActionType} on {TargetType}:{TargetId} by Admin {AdminId} Result={Result}",
                actionType, targetType, targetId, adminId, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record Identity AuditLog: ActionType={ActionType}, TargetId={TargetId}, AdminId={AdminId}",
                actionType, targetId, adminId);
        }
    }

    private static string? SanitizeDetails(object? details)
    {
        if (details == null) return null;

        try
        {
            var json = JsonSerializer.Serialize(details);
            // Redact any passwords or tokens if accidentally included
            json = Regex.Replace(json, @"(?i)""(password|pwd|hash|token|secret|jwt)""\s*:\s*""[^""]*""", @"""$1"":""[REDACTED]""");
            return json.Length > 2000 ? json[..2000] + "...[TRUNCATED]" : json;
        }
        catch
        {
            return "{\"summary\":\"User operation audit entry\"}";
        }
    }
}

