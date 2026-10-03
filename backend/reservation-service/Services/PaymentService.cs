using System.Data;
using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Services;

public sealed class PaymentService : IPaymentService
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IImageStorageService _imageStorageService;
    private readonly PayHereOptions _payHereOptions;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        DatabaseHelper databaseHelper,
        IPaymentRepository paymentRepository,
        IOutboxRepository outboxRepository,
        IImageStorageService imageStorageService,
        IOptions<PayHereOptions> payHereOptions,
        ILogger<PaymentService> logger)
    {
        _databaseHelper = databaseHelper;
        _paymentRepository = paymentRepository;
        _outboxRepository = outboxRepository;
        _imageStorageService = imageStorageService;
        _payHereOptions = payHereOptions.Value;
        _logger = logger;
    }

    public async Task<PayHereCheckoutResponse> CreatePayHereCheckoutAsync(
        int customerId,
        PaymentCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateOrderType(request.OrderType);

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var (isFound, isOwned, isEligible, errorMessage, totalAmount, orderRef) =
            await ValidateOrderAsync(connection, customerId, request.OrderType, request.OrderId, cancellationToken);

        if (!isFound)
        {
            throw new KeyNotFoundException(errorMessage);
        }

        if (!isOwned)
        {
            throw new UnauthorizedAccessException(errorMessage);
        }

        if (!isEligible)
        {
            throw new InvalidOperationException(errorMessage);
        }

        var existingSuccess = await _paymentRepository.GetSuccessfulPaymentForOrderAsync(
            request.OrderType,
            request.OrderId,
            connection,
            null,
            cancellationToken);

        if (existingSuccess != null)
        {
            throw new InvalidOperationException("This order has already been paid successfully.");
        }

        var prefix = request.OrderType == PaymentConstants.OrderTypes.DineIn ? "DIN" : "PRE";
        var merchantRef = $"PAY-{prefix}-{request.OrderId:D6}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

        var payment = new Payment
        {
            CustomerId = customerId,
            OrderType = request.OrderType,
            OrderId = request.OrderId,
            PaymentMethod = PaymentConstants.PaymentMethods.PayHere,
            Amount = totalAmount,
            Currency = _payHereOptions.Currency,
            Status = PaymentConstants.PaymentStatuses.Pending,
            MerchantOrderReference = merchantRef
        };

        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            await _paymentRepository.CreatePaymentAsync(payment, connection, transaction, cancellationToken);

            await PaymentLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                payment,
                PaymentLifecycleEventTypes.PaymentPending,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Created PayHere checkout for CustomerId {CustomerId}, OrderType {OrderType}, OrderId {OrderId}, PaymentRef {PaymentRef}, Amount {Amount} {Currency}.",
            customerId,
            request.OrderType,
            request.OrderId,
            merchantRef,
            totalAmount,
            _payHereOptions.Currency);

        var hash = PayHereSecurityHelper.GenerateCheckoutHash(
            _payHereOptions.MerchantId,
            merchantRef,
            totalAmount,
            _payHereOptions.Currency,
            _payHereOptions.MerchantSecret);

        return new PayHereCheckoutResponse
        {
            PaymentId = payment.PaymentId,
            MerchantId = _payHereOptions.MerchantId,
            MerchantOrderReference = merchantRef,
            Amount = totalAmount,
            Currency = _payHereOptions.Currency,
            Hash = hash,
            CheckoutUrl = _payHereOptions.CheckoutUrl,
            NotifyUrl = _payHereOptions.NotifyUrl,
            ReturnUrl = _payHereOptions.ReturnUrl,
            CancelUrl = _payHereOptions.CancelUrl,
            OrderType = request.OrderType,
            OrderId = request.OrderId
        };
    }

    public async Task<PaymentStatusResponse> RequestCashPaymentAsync(
        int customerId,
        CashPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateOrderType(request.OrderType);

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var (isFound, isOwned, isEligible, errorMessage, totalAmount, _) =
            await ValidateOrderAsync(connection, customerId, request.OrderType, request.OrderId, cancellationToken);

        if (!isFound)
        {
            throw new KeyNotFoundException(errorMessage);
        }

        if (!isOwned)
        {
            throw new UnauthorizedAccessException(errorMessage);
        }

        if (!isEligible)
        {
            throw new InvalidOperationException(errorMessage);
        }

        var existingSuccess = await _paymentRepository.GetSuccessfulPaymentForOrderAsync(
            request.OrderType,
            request.OrderId,
            connection,
            null,
            cancellationToken);

        if (existingSuccess != null)
        {
            throw new InvalidOperationException("This order has already been paid successfully.");
        }

        var prefix = request.OrderType == PaymentConstants.OrderTypes.DineIn ? "DIN" : "PRE";
        var merchantRef = $"CASH-{prefix}-{request.OrderId:D6}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

        var payment = new Payment
        {
            CustomerId = customerId,
            OrderType = request.OrderType,
            OrderId = request.OrderId,
            PaymentMethod = PaymentConstants.PaymentMethods.Cash,
            Amount = totalAmount,
            Currency = _payHereOptions.Currency,
            Status = PaymentConstants.PaymentStatuses.Pending,
            CustomerNotes = request.CustomerNotes,
            MerchantOrderReference = merchantRef
        };

        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            await _paymentRepository.CreatePaymentAsync(payment, connection, transaction, cancellationToken);

            await PaymentLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                payment,
                PaymentLifecycleEventTypes.PaymentPending,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Created Cash payment request for CustomerId {CustomerId}, OrderType {OrderType}, OrderId {OrderId}, PaymentRef {PaymentRef}.",
            customerId,
            request.OrderType,
            request.OrderId,
            merchantRef);

        return MapToResponse(payment);
    }

    public async Task<PaymentStatusResponse> SubmitBankTransferSlipAsync(
        int customerId,
        BankTransferPaymentFormRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateOrderType(request.OrderType);

        if (request.SlipFile == null || request.SlipFile.Length == 0)
        {
            throw new ArgumentException("A valid bank transfer deposit slip file is required.");
        }

        const long maxBytes = 5 * 1024 * 1024;
        if (request.SlipFile.Length > maxBytes)
        {
            throw new ArgumentException("Slip file size exceeds maximum allowed 5MB limit.");
        }

        var ext = Path.GetExtension(request.SlipFile.FileName).ToLowerInvariant();
        var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
        if (!allowedExts.Contains(ext))
        {
            throw new ArgumentException("Only JPG, JPEG, PNG, WEBP, or PDF files are permitted for deposit slips.");
        }

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var (isFound, isOwned, isEligible, errorMessage, totalAmount, _) =
            await ValidateOrderAsync(connection, customerId, request.OrderType, request.OrderId, cancellationToken);

        if (!isFound)
        {
            throw new KeyNotFoundException(errorMessage);
        }

        if (!isOwned)
        {
            throw new UnauthorizedAccessException(errorMessage);
        }

        if (!isEligible)
        {
            throw new InvalidOperationException(errorMessage);
        }

        var existingSuccess = await _paymentRepository.GetSuccessfulPaymentForOrderAsync(
            request.OrderType,
            request.OrderId,
            connection,
            null,
            cancellationToken);

        if (existingSuccess != null)
        {
            throw new InvalidOperationException("This order has already been paid successfully.");
        }

        var slipUrl = await _imageStorageService.SaveImageAsync(request.SlipFile, cancellationToken);

        var prefix = request.OrderType == PaymentConstants.OrderTypes.DineIn ? "DIN" : "PRE";
        var merchantRef = $"BANK-{prefix}-{request.OrderId:D6}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

        var payment = new Payment
        {
            CustomerId = customerId,
            OrderType = request.OrderType,
            OrderId = request.OrderId,
            PaymentMethod = PaymentConstants.PaymentMethods.BankTransfer,
            Amount = totalAmount,
            Currency = _payHereOptions.Currency,
            Status = PaymentConstants.PaymentStatuses.Pending,
            ProviderPaymentId = request.DepositReference,
            SlipUrl = slipUrl,
            CustomerNotes = request.CustomerNotes,
            MerchantOrderReference = merchantRef
        };

        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            await _paymentRepository.CreatePaymentAsync(payment, connection, transaction, cancellationToken);

            await PaymentLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                payment,
                PaymentLifecycleEventTypes.PaymentPending,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Submitted Bank Transfer slip for CustomerId {CustomerId}, OrderType {OrderType}, OrderId {OrderId}, PaymentRef {PaymentRef}.",
            customerId,
            request.OrderType,
            request.OrderId,
            merchantRef);

        return MapToResponse(payment);
    }

    public async Task<bool> ProcessPayHereNotificationAsync(
        PayHereNotifyForm form,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(form.merchant_id) ||
            string.IsNullOrWhiteSpace(form.order_id) ||
            string.IsNullOrWhiteSpace(form.payhere_amount) ||
            string.IsNullOrWhiteSpace(form.payhere_currency) ||
            string.IsNullOrWhiteSpace(form.status_code) ||
            string.IsNullOrWhiteSpace(form.md5sig))
        {
            _logger.LogWarning("PayHere webhook notification rejected: missing required parameters.");
            return false;
        }

        if (!string.Equals(form.merchant_id, _payHereOptions.MerchantId, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "PayHere webhook notification rejected: merchant_id mismatch (expected {ExpectedMerchantId}).",
                _payHereOptions.MerchantId);
            return false;
        }

        var isSigValid = PayHereSecurityHelper.VerifyNotificationSignature(
            form.merchant_id,
            form.order_id,
            form.payhere_amount,
            form.payhere_currency,
            form.status_code,
            _payHereOptions.MerchantSecret,
            form.md5sig);

        if (!isSigValid)
        {
            _logger.LogWarning(
                "PayHere webhook notification rejected: invalid md5sig checksum for OrderRef {OrderRef}.",
                form.order_id);
            return false;
        }

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var payment = await _paymentRepository.GetPaymentByMerchantReferenceAsync(
            form.order_id,
            connection,
            null,
            cancellationToken);

        if (payment == null)
        {
            _logger.LogWarning(
                "PayHere webhook notification received for non-existent payment reference {OrderRef}.",
                form.order_id);
            return false;
        }

        if (!decimal.TryParse(form.payhere_amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var payhereAmount) ||
            payment.Amount != payhereAmount ||
            !string.Equals(payment.Currency, form.payhere_currency, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "PayHere webhook notification amount or currency mismatch for OrderRef {OrderRef}. Stored: {Amount} {Currency}, Received: {ReceivedAmount} {ReceivedCurrency}.",
                form.order_id,
                payment.Amount,
                payment.Currency,
                form.payhere_amount,
                form.payhere_currency);
            return false;
        }

        var providerPaymentId = !string.IsNullOrWhiteSpace(form.payment_id)
            ? form.payment_id
            : form.order_id;

        var alreadyProcessed = await _paymentRepository.HasNotificationBeenProcessedAsync(
            "PayHere",
            providerPaymentId,
            connection,
            null,
            cancellationToken);

        if (alreadyProcessed)
        {
            _logger.LogInformation(
                "PayHere webhook notification for ProviderPaymentId {ProviderPaymentId} was already processed idempotently.",
                providerPaymentId);
            return true;
        }

        var targetStatus = form.status_code switch
        {
            "2" => PaymentConstants.PaymentStatuses.Succeeded,
            "0" => PaymentConstants.PaymentStatuses.Pending,
            "-1" => PaymentConstants.PaymentStatuses.Cancelled,
            "-2" or "-3" => PaymentConstants.PaymentStatuses.Failed,
            _ => PaymentConstants.PaymentStatuses.Failed
        };

        var eventType = targetStatus switch
        {
            PaymentConstants.PaymentStatuses.Succeeded => PaymentLifecycleEventTypes.PaymentSucceeded,
            PaymentConstants.PaymentStatuses.Failed => PaymentLifecycleEventTypes.PaymentFailed,
            PaymentConstants.PaymentStatuses.Cancelled => PaymentLifecycleEventTypes.PaymentCancelled,
            _ => PaymentLifecycleEventTypes.PaymentPending
        };

        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            await _paymentRepository.UpdatePaymentStatusAsync(
                payment.PaymentId,
                targetStatus,
                providerPaymentId,
                null,
                null,
                connection,
                transaction,
                cancellationToken);

            var notificationEvent = new PaymentNotificationEvent
            {
                Provider = "PayHere",
                ProviderPaymentId = providerPaymentId,
                MerchantOrderReference = form.order_id,
                StatusCode = form.status_code,
                PayHereAmount = payhereAmount,
                PayHereCurrency = form.payhere_currency,
                SignatureHash = form.md5sig,
                IsSuccess = (targetStatus == PaymentConstants.PaymentStatuses.Succeeded)
            };

            await _paymentRepository.RecordNotificationEventAsync(
                notificationEvent,
                connection,
                transaction,
                cancellationToken);

            payment.Status = targetStatus;
            payment.ProviderPaymentId = providerPaymentId;

            await PaymentLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                payment,
                eventType,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Processed PayHere notification for PaymentId {PaymentId} ({OrderRef}) to status {Status}.",
            payment.PaymentId,
            form.order_id,
            targetStatus);

        return true;
    }

    public async Task<PaymentStatusResponse?> GetPaymentStatusForOrderAsync(
        int customerId,
        string orderType,
        int orderId,
        bool isStaff,
        CancellationToken cancellationToken = default)
    {
        ValidateOrderType(orderType);

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var payment = await _paymentRepository.GetLatestPaymentForOrderAsync(
            orderType,
            orderId,
            connection,
            null,
            cancellationToken);

        if (payment == null)
        {
            return null;
        }

        if (!isStaff && payment.CustomerId != customerId)
        {
            throw new UnauthorizedAccessException("You do not have access to view payment details for this order.");
        }

        return MapToResponse(payment);
    }

    public async Task<IReadOnlyList<PaymentStatusResponse>> GetPendingVerificationsAsync(
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var payments = await _paymentRepository.GetPendingVerificationsAsync(connection, cancellationToken);
        return payments.Select(MapToResponse).ToList();
    }

    public async Task<PaymentStatusResponse> VerifyPaymentAsync(
        int staffUserId,
        int paymentId,
        VerifyPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);

        var payment = await _paymentRepository.GetPaymentByIdAsync(
            paymentId,
            connection,
            null,
            cancellationToken);

        if (payment == null)
        {
            throw new KeyNotFoundException($"Payment record {paymentId} not found.");
        }

        if (payment.Status != PaymentConstants.PaymentStatuses.Pending)
        {
            throw new InvalidOperationException($"Cannot verify payment in '{payment.Status}' state.");
        }

        var isApprove = string.Equals(request.Action, "Approve", StringComparison.OrdinalIgnoreCase);
        var targetStatus = isApprove
            ? PaymentConstants.PaymentStatuses.Succeeded
            : PaymentConstants.PaymentStatuses.Failed;

        var eventType = isApprove
            ? PaymentLifecycleEventTypes.PaymentSucceeded
            : PaymentLifecycleEventTypes.PaymentFailed;

        var verifiedAt = DateTime.UtcNow;

        await using (var transaction = await connection.BeginTransactionAsync(cancellationToken))
        {
            await _paymentRepository.UpdatePaymentStatusAsync(
                paymentId,
                targetStatus,
                null,
                staffUserId,
                verifiedAt,
                connection,
                transaction,
                cancellationToken);

            payment.Status = targetStatus;
            payment.VerifiedBy = staffUserId;
            payment.VerifiedAt = verifiedAt;

            await PaymentLifecycleOutboxHelper.InsertAsync(
                connection,
                transaction,
                _outboxRepository,
                payment,
                eventType,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Staff user {StaffUserId} verified PaymentId {PaymentId} with action {Action} -> new status {Status}.",
            staffUserId,
            paymentId,
            request.Action,
            targetStatus);

        return MapToResponse(payment);
    }

    private static void ValidateOrderType(string orderType)
    {
        if (orderType != PaymentConstants.OrderTypes.DineIn &&
            orderType != PaymentConstants.OrderTypes.ReservationPreOrder)
        {
            throw new ArgumentException($"Invalid order type '{orderType}'. Allowed: DineIn, ReservationPreOrder.");
        }
    }

    private static async Task<(bool isFound, bool isOwned, bool isEligible, string errorMessage, decimal totalAmount, string orderRef)>
        ValidateOrderAsync(
            MySqlConnection connection,
            int customerId,
            string orderType,
            int orderId,
            CancellationToken cancellationToken)
    {
        if (orderType == PaymentConstants.OrderTypes.DineIn)
        {
            const string sql = """
                SELECT OrderId, CustomerId, Status, TotalAmount
                FROM DineInOrders
                WHERE OrderId = @OrderId
                LIMIT 1;
                """;

            using var command = new MySqlCommand(sql, connection);
            command.Parameters.AddWithValue("@OrderId", orderId);

            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return (false, false, false, $"Dine-in order #{orderId} not found.", 0, "");
            }

            var ownerId = reader.GetInt32("CustomerId");
            var status = reader.GetString("Status");
            var totalAmount = reader.GetDecimal("TotalAmount");
            var orderRef = $"DIN-{orderId:D6}";

            if (ownerId != customerId)
            {
                return (true, false, false, "You do not own this dine-in order.", 0, orderRef);
            }

            // SR-280 / SR-286: Dine-in orders are payable only after reaching the Served state.
            if (!string.Equals(status, "Served", StringComparison.OrdinalIgnoreCase))
            {
                return (true, true, false,
                    $"Dine-in order #{orderId} is currently in state '{status}'. Payment can only be made after the order has been Served.",
                    totalAmount, orderRef);
            }

            return (true, true, true, string.Empty, totalAmount, orderRef);
        }
        else
        {
            const string sql = """
                SELECT OrderId, CustomerId, Status, TotalAmount
                FROM ReservationPreOrders
                WHERE OrderId = @OrderId
                LIMIT 1;
                """;

            using var command = new MySqlCommand(sql, connection);
            command.Parameters.AddWithValue("@OrderId", orderId);

            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return (false, false, false, $"Reservation pre-order #{orderId} not found.", 0, "");
            }

            var ownerId = reader.GetInt32("CustomerId");
            var status = reader.GetString("Status");
            var totalAmount = reader.GetDecimal("TotalAmount");
            var orderRef = $"PRE-{orderId:D6}";

            if (ownerId != customerId)
            {
                return (true, false, false, "You do not own this reservation pre-order.", 0, orderRef);
            }

            // SR-280 / SR-286: Pre-orders are payable after creation, except when cancelled.
            if (string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return (true, true, false, "Cannot process payment for a cancelled reservation pre-order.", totalAmount, orderRef);
            }

            return (true, true, true, string.Empty, totalAmount, orderRef);
        }
    }

    private static PaymentStatusResponse MapToResponse(Payment p) => new()
    {
        PaymentId = p.PaymentId,
        CustomerId = p.CustomerId,
        OrderType = p.OrderType,
        OrderId = p.OrderId,
        PaymentMethod = p.PaymentMethod,
        Amount = p.Amount,
        Currency = p.Currency,
        Status = p.Status,
        MerchantOrderReference = p.MerchantOrderReference,
        ProviderPaymentId = p.ProviderPaymentId,
        SlipUrl = p.SlipUrl,
        CustomerNotes = p.CustomerNotes,
        VerifiedBy = p.VerifiedBy,
        VerifiedAt = p.VerifiedAt,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
