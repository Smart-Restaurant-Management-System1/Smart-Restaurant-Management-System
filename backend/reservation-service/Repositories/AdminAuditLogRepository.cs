using System.Data;
using System.Text;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Repositories;

/// <summary>
/// Authoritative MySQL repository for append-only audit trail records (SR-223 / SR-250).
/// Strictly excludes update or delete operations to preserve compliance integrity.
/// </summary>
public class AdminAuditLogRepository : IAuditLogRepository
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly ILogger<AdminAuditLogRepository> _logger;

    public AdminAuditLogRepository(DatabaseHelper databaseHelper, ILogger<AdminAuditLogRepository> logger)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;
    }

    public async Task<long> InsertAsync(AdminAuditLog log, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO AdminAuditLogs (
                TimestampUtc, ActionType, AdminId, AdminEmail, AdminRole,
                TargetType, TargetId, Result, DetailsJson, SourceService, IpAddress
            ) VALUES (
                @TimestampUtc, @ActionType, @AdminId, @AdminEmail, @AdminRole,
                @TargetType, @TargetId, @Result, @DetailsJson, @SourceService, @IpAddress
            );
            SELECT LAST_INSERT_ID();
            """;

        try
        {
            await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
            await using var command = new MySqlCommand(sql, connection);

            command.Parameters.AddWithValue("@TimestampUtc", log.TimestampUtc == default ? DateTime.UtcNow : log.TimestampUtc);
            command.Parameters.AddWithValue("@ActionType", log.ActionType);
            command.Parameters.AddWithValue("@AdminId", log.AdminId);
            command.Parameters.AddWithValue("@AdminEmail", log.AdminEmail);
            command.Parameters.AddWithValue("@AdminRole", log.AdminRole);
            command.Parameters.AddWithValue("@TargetType", log.TargetType);
            command.Parameters.AddWithValue("@TargetId", (object?)log.TargetId ?? DBNull.Value);
            command.Parameters.AddWithValue("@Result", log.Result);
            command.Parameters.AddWithValue("@DetailsJson", (object?)log.DetailsJson ?? DBNull.Value);
            command.Parameters.AddWithValue("@SourceService", log.SourceService);
            command.Parameters.AddWithValue("@IpAddress", (object?)log.IpAddress ?? DBNull.Value);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt64(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to insert AdminAuditLog for ActionType={ActionType}, TargetType={TargetType}, AdminId={AdminId}",
                log.ActionType, log.TargetType, log.AdminId);
            throw;
        }
    }

    public async Task<PagedAuditLogsResultDto> GetPagedAuditLogsAsync(AdminAuditLogQueryDto query, CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;
        var offset = (page - 1) * pageSize;

        var whereClauses = new List<string>();
        var parameters = new List<MySqlParameter>();

        if (query.FromDate.HasValue)
        {
            whereClauses.Add("TimestampUtc >= @FromDate");
            parameters.Add(new MySqlParameter("@FromDate", query.FromDate.Value));
        }

        if (query.ToDate.HasValue)
        {
            whereClauses.Add("TimestampUtc <= @ToDate");
            parameters.Add(new MySqlParameter("@ToDate", query.ToDate.Value));
        }

        if (!string.IsNullOrWhiteSpace(query.ActionType))
        {
            whereClauses.Add("ActionType = @ActionType");
            parameters.Add(new MySqlParameter("@ActionType", query.ActionType.Trim()));
        }

        if (query.AdminId.HasValue && query.AdminId.Value > 0)
        {
            whereClauses.Add("AdminId = @AdminId");
            parameters.Add(new MySqlParameter("@AdminId", query.AdminId.Value));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchPattern = $"%{query.Search.Trim()}%";
            whereClauses.Add("(AdminEmail LIKE @Search OR TargetId LIKE @Search OR DetailsJson LIKE @Search)");
            parameters.Add(new MySqlParameter("@Search", searchPattern));
        }

        var whereSql = whereClauses.Count > 0
            ? "WHERE " + string.Join(" AND ", whereClauses)
            : string.Empty;

        var countSql = $"SELECT COUNT(*) FROM AdminAuditLogs {whereSql};";
        var dataSql = $"""
            SELECT AuditLogId, TimestampUtc, ActionType, AdminId, AdminEmail, AdminRole,
                   TargetType, TargetId, Result, DetailsJson, SourceService, IpAddress
            FROM AdminAuditLogs
            {whereSql}
            ORDER BY TimestampUtc DESC, AuditLogId DESC
            LIMIT @Limit OFFSET @Offset;
            """;

        try
        {
            await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

            // 1. Get total count
            int totalCount;
            await using (var countCmd = new MySqlCommand(countSql, connection))
            {
                foreach (var p in parameters) countCmd.Parameters.Add((MySqlParameter)((ICloneable)p).Clone());
                var countScalar = await countCmd.ExecuteScalarAsync(cancellationToken);
                totalCount = Convert.ToInt32(countScalar);
            }

            // 2. Fetch page items
            var items = new List<AdminAuditLogResponseDto>();
            await using (var dataCmd = new MySqlCommand(dataSql, connection))
            {
                foreach (var p in parameters) dataCmd.Parameters.Add((MySqlParameter)((ICloneable)p).Clone());
                dataCmd.Parameters.AddWithValue("@Limit", pageSize);
                dataCmd.Parameters.AddWithValue("@Offset", offset);

                await using var reader = await dataCmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    items.Add(new AdminAuditLogResponseDto
                    {
                        AuditLogId = reader.GetInt64("AuditLogId"),
                        TimestampUtc = reader.GetDateTime("TimestampUtc"),
                        ActionType = reader.GetString("ActionType"),
                        AdminId = reader.GetInt32("AdminId"),
                        AdminEmail = reader.GetString("AdminEmail"),
                        AdminRole = reader.GetString("AdminRole"),
                        TargetType = reader.GetString("TargetType"),
                        TargetId = reader.IsDBNull(reader.GetOrdinal("TargetId")) ? null : reader.GetString("TargetId"),
                        Result = reader.GetString("Result"),
                        DetailsJson = reader.IsDBNull(reader.GetOrdinal("DetailsJson")) ? null : reader.GetString("DetailsJson"),
                        SourceService = reader.GetString("SourceService"),
                        IpAddress = reader.IsDBNull(reader.GetOrdinal("IpAddress")) ? null : reader.GetString("IpAddress")
                    });
                }
            }

            return new PagedAuditLogsResultDto
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve paged AdminAuditLogs");
            throw;
        }
    }

    public async Task<IReadOnlyList<string>> GetDistinctActionTypesAsync(CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT DISTINCT ActionType FROM AdminAuditLogs ORDER BY ActionType ASC;";
        var results = new List<string>();

        try
        {
            await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
            await using var command = new MySqlCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(reader.GetString(0));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve distinct action types from AdminAuditLogs");
            throw;
        }
    }
}

