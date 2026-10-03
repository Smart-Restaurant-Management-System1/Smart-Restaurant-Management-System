using System.Data;
using MySqlConnector;
using ReservationService.Models;

namespace ReservationService.Repositories;

public sealed class PaymentRepository : IPaymentRepository
{
    public async Task<int> CreatePaymentAsync(
        Payment payment,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO Payments (
                CustomerId, OrderType, OrderId, PaymentMethod,
                Amount, Currency, Status, MerchantOrderReference,
                ProviderPaymentId, SlipUrl, CustomerNotes,
                CreatedAt, UpdatedAt
            ) VALUES (
                @CustomerId, @OrderType, @OrderId, @PaymentMethod,
                @Amount, @Currency, @Status, @MerchantOrderReference,
                @ProviderPaymentId, @SlipUrl, @CustomerNotes,
                UTC_TIMESTAMP(), UTC_TIMESTAMP()
            );
            SELECT LAST_INSERT_ID();
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@CustomerId", payment.CustomerId);
        command.Parameters.AddWithValue("@OrderType", payment.OrderType);
        command.Parameters.AddWithValue("@OrderId", payment.OrderId);
        command.Parameters.AddWithValue("@PaymentMethod", payment.PaymentMethod);
        command.Parameters.AddWithValue("@Amount", payment.Amount);
        command.Parameters.AddWithValue("@Currency", payment.Currency);
        command.Parameters.AddWithValue("@Status", payment.Status);
        command.Parameters.AddWithValue("@MerchantOrderReference", payment.MerchantOrderReference);
        command.Parameters.AddWithValue("@ProviderPaymentId", (object?)payment.ProviderPaymentId ?? DBNull.Value);
        command.Parameters.AddWithValue("@SlipUrl", (object?)payment.SlipUrl ?? DBNull.Value);
        command.Parameters.AddWithValue("@CustomerNotes", (object?)payment.CustomerNotes ?? DBNull.Value);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        var id = Convert.ToInt32(result);
        payment.PaymentId = id;
        return id;
    }

    public async Task<Payment?> GetPaymentByIdAsync(
        int paymentId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE PaymentId = @PaymentId
            LIMIT 1;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@PaymentId", paymentId);

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapPayment(reader);
        }

        return null;
    }

    public async Task<Payment?> GetPaymentByMerchantReferenceAsync(
        string merchantRef,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE MerchantOrderReference = @MerchantOrderReference
            LIMIT 1;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@MerchantOrderReference", merchantRef);

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapPayment(reader);
        }

        return null;
    }

    public async Task<Payment?> GetLatestPaymentForOrderAsync(
        string orderType,
        int orderId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE OrderType = @OrderType AND OrderId = @OrderId
            ORDER BY PaymentId DESC
            LIMIT 1;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@OrderType", orderType);
        command.Parameters.AddWithValue("@OrderId", orderId);

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapPayment(reader);
        }

        return null;
    }

    public async Task<Payment?> GetSuccessfulPaymentForOrderAsync(
        string orderType,
        int orderId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE OrderType = @OrderType AND OrderId = @OrderId AND Status = 'Succeeded'
            LIMIT 1;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@OrderType", orderType);
        command.Parameters.AddWithValue("@OrderId", orderId);

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return MapPayment(reader);
        }

        return null;
    }

    public async Task<bool> UpdatePaymentStatusAsync(
        int paymentId,
        string status,
        string? providerPaymentId,
        int? verifiedBy,
        DateTime? verifiedAt,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE Payments
            SET Status = @Status,
                ProviderPaymentId = COALESCE(@ProviderPaymentId, ProviderPaymentId),
                VerifiedBy = COALESCE(@VerifiedBy, VerifiedBy),
                VerifiedAt = COALESCE(@VerifiedAt, VerifiedAt),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE PaymentId = @PaymentId;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@PaymentId", paymentId);
        command.Parameters.AddWithValue("@Status", status);
        command.Parameters.AddWithValue("@ProviderPaymentId", (object?)providerPaymentId ?? DBNull.Value);
        command.Parameters.AddWithValue("@VerifiedBy", (object?)verifiedBy ?? DBNull.Value);
        command.Parameters.AddWithValue("@VerifiedAt", (object?)verifiedAt ?? DBNull.Value);

        var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
        return rowsAffected > 0;
    }

    public async Task<bool> HasNotificationBeenProcessedAsync(
        string provider,
        string providerPaymentId,
        MySqlConnection connection,
        MySqlTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM PaymentNotificationEvents
            WHERE Provider = @Provider AND ProviderPaymentId = @ProviderPaymentId;
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@Provider", provider);
        command.Parameters.AddWithValue("@ProviderPaymentId", providerPaymentId);

        var count = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return count > 0;
    }

    public async Task<int> RecordNotificationEventAsync(
        PaymentNotificationEvent notificationEvent,
        MySqlConnection connection,
        MySqlTransaction? transaction,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO PaymentNotificationEvents (
                Provider, ProviderPaymentId, MerchantOrderReference,
                StatusCode, PayHereAmount, PayHereCurrency,
                SignatureHash, ProcessedAt, IsSuccess
            ) VALUES (
                @Provider, @ProviderPaymentId, @MerchantOrderReference,
                @StatusCode, @PayHereAmount, @PayHereCurrency,
                @SignatureHash, UTC_TIMESTAMP(), @IsSuccess
            );
            SELECT LAST_INSERT_ID();
            """;

        using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@Provider", notificationEvent.Provider);
        command.Parameters.AddWithValue("@ProviderPaymentId", notificationEvent.ProviderPaymentId);
        command.Parameters.AddWithValue("@MerchantOrderReference", notificationEvent.MerchantOrderReference);
        command.Parameters.AddWithValue("@StatusCode", notificationEvent.StatusCode);
        command.Parameters.AddWithValue("@PayHereAmount", notificationEvent.PayHereAmount);
        command.Parameters.AddWithValue("@PayHereCurrency", notificationEvent.PayHereCurrency);
        command.Parameters.AddWithValue("@SignatureHash", notificationEvent.SignatureHash);
        command.Parameters.AddWithValue("@IsSuccess", notificationEvent.IsSuccess ? 1 : 0);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        var id = Convert.ToInt32(result);
        notificationEvent.NotificationId = id;
        return id;
    }

    public async Task<IReadOnlyList<Payment>> GetPendingVerificationsAsync(
        MySqlConnection connection,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE Status = 'Pending' AND PaymentMethod IN ('Cash', 'BankTransfer')
            ORDER BY PaymentId ASC;
            """;

        using var command = new MySqlCommand(sql, connection);
        using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var list = new List<Payment>();
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(MapPayment(reader));
        }

        return list;
    }

    public async Task<IReadOnlyList<Payment>> GetPaymentHistoryAsync(
        string? status,
        int limit,
        MySqlConnection connection,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT PaymentId, CustomerId, OrderType, OrderId, PaymentMethod,
                   Amount, Currency, Status, MerchantOrderReference,
                   ProviderPaymentId, SlipUrl, CustomerNotes,
                   VerifiedBy, VerifiedAt, CreatedAt, UpdatedAt
            FROM Payments
            WHERE (@Status IS NULL OR Status = @Status)
            ORDER BY UpdatedAt DESC, PaymentId DESC
            LIMIT @Limit;
            """;

        using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Status", string.IsNullOrWhiteSpace(status) ? (object)DBNull.Value : status);
        command.Parameters.AddWithValue("@Limit", limit <= 0 ? 100 : limit);

        using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var list = new List<Payment>();
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(MapPayment(reader));
        }

        return list;
    }

    private static Payment MapPayment(MySqlDataReader reader)
    {
        return new Payment
        {
            PaymentId = reader.GetInt32("PaymentId"),
            CustomerId = reader.GetInt32("CustomerId"),
            OrderType = reader.GetString("OrderType"),
            OrderId = reader.GetInt32("OrderId"),
            PaymentMethod = reader.GetString("PaymentMethod"),
            Amount = reader.GetDecimal("Amount"),
            Currency = reader.GetString("Currency"),
            Status = reader.GetString("Status"),
            MerchantOrderReference = reader.GetString("MerchantOrderReference"),
            ProviderPaymentId = reader.IsDBNull(reader.GetOrdinal("ProviderPaymentId"))
                ? null
                : reader.GetString("ProviderPaymentId"),
            SlipUrl = reader.IsDBNull(reader.GetOrdinal("SlipUrl"))
                ? null
                : reader.GetString("SlipUrl"),
            CustomerNotes = reader.IsDBNull(reader.GetOrdinal("CustomerNotes"))
                ? null
                : reader.GetString("CustomerNotes"),
            VerifiedBy = reader.IsDBNull(reader.GetOrdinal("VerifiedBy"))
                ? null
                : reader.GetInt32("VerifiedBy"),
            VerifiedAt = reader.IsDBNull(reader.GetOrdinal("VerifiedAt"))
                ? null
                : reader.GetDateTime("VerifiedAt"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            UpdatedAt = reader.GetDateTime("UpdatedAt")
        };
    }
}
