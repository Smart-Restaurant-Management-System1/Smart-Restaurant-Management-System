using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Roles = AppRoles.Customer)]
public sealed class ReservationPreOrdersController : ControllerBase
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly ILogger<ReservationPreOrdersController> _logger;

    public ReservationPreOrdersController(
        DatabaseHelper databaseHelper,
        ILogger<ReservationPreOrdersController> logger)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;
    }

    [HttpPost("reservation-pre-order")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReservationPreOrder(
        [FromBody] CreateReservationPreOrderRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var customerId) ||
            customerId <= 0)
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        if (request is null ||
            request.ReservationId <= 0 ||
            request.Items is null ||
            request.Items.Count == 0)
        {
            return BadRequest(new
            {
                message = "A reservation and at least one order item are required."
            });
        }

        if (request.Items.Any(item =>
                item.MenuItemId <= 0 ||
                item.Quantity <= 0 ||
                item.Quantity > 99) ||
            request.Items
                .GroupBy(item => item.MenuItemId)
                .Any(group => group.Count() > 1))
        {
            return BadRequest(new
            {
                message = "Each menu item must have a valid quantity and appear only once."
            });
        }

        if (string.IsNullOrWhiteSpace(idempotencyKey) ||
            idempotencyKey.Length > 64)
        {
            return BadRequest(new
            {
                message = "A valid Idempotency-Key header is required."
            });
        }

        await using var connection =
            await _databaseHelper.CreateConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var existingOrder =
                await FindExistingOrderAsync(
                    connection,
                    transaction,
                    customerId,
                    idempotencyKey,
                    cancellationToken);

            if (existingOrder is not null)
            {
                await transaction.CommitAsync(cancellationToken);
                return Ok(existingOrder);
            }

            var reservation =
                await GetEligibleReservationAsync(
                    connection,
                    transaction,
                    customerId,
                    request.ReservationId,
                    cancellationToken);

            if (reservation is null)
            {
                await transaction.RollbackAsync(cancellationToken);

                return NotFound(new
                {
                    message = "The reservation could not be found."
                });
            }

            if (reservation.Status is "Cancelled" or "Completed")
            {
                await transaction.RollbackAsync(cancellationToken);

                return Conflict(new
                {
                    message = "Pre-orders cannot be placed for this reservation."
                });
            }

            if (reservation.StartDateTime <= DateTime.Now)
            {
                await transaction.RollbackAsync(cancellationToken);

                return Conflict(new
                {
                    message = "The reservation has already started or expired."
                });
            }

            if (reservation.Status is not ("Pending" or "Confirmed"))
            {
                await transaction.RollbackAsync(cancellationToken);

                return Conflict(new
                {
                    message = "The reservation is not eligible for a pre-order."
                });
            }

            var menuItems =
                await GetAvailableMenuItemsAsync(
                    connection,
                    transaction,
                    request.Items.Select(item => item.MenuItemId),
                    cancellationToken);

            if (menuItems.Count != request.Items.Count)
            {
                await transaction.RollbackAsync(cancellationToken);

                return Conflict(new
                {
                    message = "One or more selected menu items are unavailable."
                });
            }

            var total = request.Items.Sum(item =>
                menuItems[item.MenuItemId].Price * item.Quantity);

            var orderId =
                await InsertPreOrderAsync(
                    connection,
                    transaction,
                    customerId,
                    reservation.ReservationId,
                    idempotencyKey,
                    total,
                    cancellationToken);

            await InsertPreOrderItemsAsync(
                connection,
                transaction,
                orderId,
                request.Items,
                menuItems,
                cancellationToken);

            var response = new ReservationPreOrderResponse(
                orderId,
                $"PRE-{orderId:D6}",
                "Pending",
                total,
                reservation.ReservationId);

            await transaction.CommitAsync(cancellationToken);

            return StatusCode(
                StatusCodes.Status201Created,
                response);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            await transaction.RollbackAsync(cancellationToken);

            var existingOrder =
                await FindExistingOrderAsync(
                    connection,
                    null,
                    customerId,
                    idempotencyKey,
                    cancellationToken);

            if (existingOrder is not null)
            {
                return Ok(existingOrder);
            }

            _logger.LogWarning(
                exception,
                "Duplicate pre-order request for customer {CustomerId}",
                customerId);

            return Conflict(new
            {
                message = "A duplicate pre-order request was detected."
            });
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);

            _logger.LogError(
                exception,
                "Unable to create reservation pre-order for customer {CustomerId}",
                customerId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "Unable to submit the pre-order. Please try again later."
                });
        }
    }

    private static async Task<ReservationDetails?> GetEligibleReservationAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        int customerId,
        int reservationId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                Id,
                CustomerId,
                TableId,
                StartDateTime,
                EndDateTime,
                Status
            FROM Reservations
            WHERE Id = @ReservationId
              AND CustomerId = @CustomerId
            FOR UPDATE;
            """;

        await using var command =
            new MySqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("@ReservationId", reservationId);
        command.Parameters.AddWithValue("@CustomerId", customerId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new ReservationDetails(
            reader.GetInt32("Id"),
            reader.GetInt32("CustomerId"),
            reader.GetInt32("TableId"),
            reader.GetDateTime("StartDateTime"),
            reader.GetDateTime("EndDateTime"),
            reader.GetString("Status"));
    }

    private static async Task<Dictionary<int, MenuItemPrice>>
        GetAvailableMenuItemsAsync(
            MySqlConnection connection,
            MySqlTransaction transaction,
            IEnumerable<int> itemIds,
            CancellationToken cancellationToken)
    {
        var ids = itemIds.Distinct().ToArray();

        var parameters = ids
            .Select((_, index) => $"@Item{index}")
            .ToArray();

        var sql = $"""
            SELECT MenuItemId, Price
            FROM MenuItems
            WHERE IsAvailable = 1
              AND MenuItemId IN ({string.Join(", ", parameters)});
            """;

        await using var command =
            new MySqlCommand(sql, connection, transaction);

        for (var index = 0; index < ids.Length; index++)
        {
            command.Parameters.AddWithValue(
                parameters[index],
                ids[index]);
        }

        var menuItems = new Dictionary<int, MenuItemPrice>();

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            menuItems[reader.GetInt32("MenuItemId")] =
                new MenuItemPrice(
                    reader.GetDecimal("Price"));
        }

        return menuItems;
    }

    private static async Task<int> InsertPreOrderAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        int customerId,
        int reservationId,
        string idempotencyKey,
        decimal total,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO ReservationPreOrders
            (
                CustomerId,
                ReservationId,
                IdempotencyKey,
                Status,
                TotalAmount
            )
            VALUES
            (
                @CustomerId,
                @ReservationId,
                @IdempotencyKey,
                'Pending',
                @TotalAmount
            );

            SELECT LAST_INSERT_ID();
            """;

        await using var command =
            new MySqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@ReservationId", reservationId);
        command.Parameters.AddWithValue("@IdempotencyKey", idempotencyKey);
        command.Parameters.AddWithValue("@TotalAmount", total);

        return Convert.ToInt32(
            await command.ExecuteScalarAsync(cancellationToken));
    }

    private static async Task InsertPreOrderItemsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        int orderId,
        IEnumerable<CreateReservationPreOrderItemRequest> items,
        IReadOnlyDictionary<int, MenuItemPrice> menuItems,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO ReservationPreOrderItems
            (
                OrderId,
                MenuItemId,
                Quantity,
                UnitPrice
            )
            VALUES
            (
                @OrderId,
                @MenuItemId,
                @Quantity,
                @UnitPrice
            );
            """;

        foreach (var item in items)
        {
            await using var command =
                new MySqlCommand(sql, connection, transaction);

            command.Parameters.AddWithValue("@OrderId", orderId);
            command.Parameters.AddWithValue("@MenuItemId", item.MenuItemId);
            command.Parameters.AddWithValue("@Quantity", item.Quantity);
            command.Parameters.AddWithValue(
                "@UnitPrice",
                menuItems[item.MenuItemId].Price);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<ReservationPreOrderResponse?>
        FindExistingOrderAsync(
            MySqlConnection connection,
            MySqlTransaction? transaction,
            int customerId,
            string idempotencyKey,
            CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                OrderId,
                ReservationId,
                Status,
                TotalAmount
            FROM ReservationPreOrders
            WHERE CustomerId = @CustomerId
              AND IdempotencyKey = @IdempotencyKey
            LIMIT 1;
            """;

        await using var command =
            new MySqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@IdempotencyKey", idempotencyKey);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var orderId = reader.GetInt32("OrderId");

        return new ReservationPreOrderResponse(
            orderId,
            $"PRE-{orderId:D6}",
            reader.GetString("Status"),
            reader.GetDecimal("TotalAmount"),
            reader.GetInt32("ReservationId"));
    }

    private sealed record ReservationDetails(
        int ReservationId,
        int CustomerId,
        int TableId,
        DateTime StartDateTime,
        DateTime EndDateTime,
        string Status);

    private sealed record MenuItemPrice(decimal Price);

    private sealed record ReservationPreOrderResponse(
        int OrderId,
        string OrderReference,
        string Status,
        decimal TotalAmount,
        int ReservationId);
}

