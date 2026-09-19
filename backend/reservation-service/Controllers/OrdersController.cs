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
public sealed class OrdersController : ControllerBase
{
    private readonly DatabaseHelper _databaseHelper;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        DatabaseHelper databaseHelper,
        ILogger<OrdersController> logger)
    {
        _databaseHelper = databaseHelper;
        _logger = logger;
    }

    [HttpPost("dine-in")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateDineInOrder(
        [FromBody] CreateDineInOrderRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId) || customerId <= 0)
        {
            return Unauthorized(new { message = "A valid customer identity is required." });
        }

        if (request is null || request.TableId <= 0 || request.Items is null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "A table and at least one order item are required." });
        }

        if (request.Items.Any(item => item.MenuItemId <= 0 || item.Quantity <= 0) ||
            request.Items.GroupBy(item => item.MenuItemId).Any(group => group.Count() > 1))
        {
            return BadRequest(new { message = "Each order item must have a valid positive quantity and appear only once." });
        }

        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 64)
        {
            return BadRequest(new { message = "A valid Idempotency-Key header is required." });
        }

        await using var connection = await _databaseHelper.CreateConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var existing = await FindOrderByIdempotencyKeyAsync(connection, transaction, customerId, idempotencyKey, cancellationToken);
            if (existing is not null)
            {
                await transaction.CommitAsync(cancellationToken);
                return Ok(existing);
            }

            if (!await IsActiveTableAsync(connection, transaction, request.TableId, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return NotFound(new { message = "The selected restaurant table could not be found or is inactive." });
            }

            var menuItems = await GetAvailableMenuItemsAsync(connection, transaction, request.Items.Select(item => item.MenuItemId), cancellationToken);
            if (menuItems.Count != request.Items.Count)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict(new { message = "One or more selected menu items are unavailable." });
            }

            var total = request.Items.Sum(item => menuItems[item.MenuItemId].Price * item.Quantity);
            var orderId = await InsertOrderAsync(connection, transaction, customerId, request.TableId, idempotencyKey, total, cancellationToken);
            await InsertOrderItemsAsync(connection, transaction, orderId, request.Items, menuItems, cancellationToken);

            var response = new DineInOrderResponse(orderId, $"DIN-{orderId:D6}", "Received", total);
            await transaction.CommitAsync(cancellationToken);
            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            await transaction.RollbackAsync(cancellationToken);
            var existing = await FindOrderByIdempotencyKeyAsync(connection, null, customerId, idempotencyKey, cancellationToken);
            if (existing is not null)
            {
                return Ok(existing);
            }

            _logger.LogWarning(exception, "Duplicate key while creating dine-in order for customer {CustomerId}", customerId);
            return Conflict(new { message = "The order could not be created due to a concurrent update. Please try again." });
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(exception, "Unable to create dine-in order for customer {CustomerId}", customerId);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to submit the order. Please try again later." });
        }
    }

    private static async Task<bool> IsActiveTableAsync(MySqlConnection connection, MySqlTransaction transaction, int tableId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM RestaurantTables WHERE Id = @TableId AND IsActive = 1);";
        await using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@TableId", tableId);
        return Convert.ToBoolean(await command.ExecuteScalarAsync(cancellationToken));
    }

    private static async Task<Dictionary<int, MenuItemPrice>> GetAvailableMenuItemsAsync(MySqlConnection connection, MySqlTransaction transaction, IEnumerable<int> itemIds, CancellationToken cancellationToken)
    {
        var ids = itemIds.Distinct().ToArray();
        var parameters = ids.Select((_, index) => $"@Item{index}").ToArray();
        var sql = $"SELECT MenuItemId, Price FROM MenuItems WHERE IsAvailable = 1 AND MenuItemId IN ({string.Join(", ", parameters)});";
        await using var command = new MySqlCommand(sql, connection, transaction);
        for (var index = 0; index < ids.Length; index++) command.Parameters.AddWithValue(parameters[index], ids[index]);

        var items = new Dictionary<int, MenuItemPrice>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) items[reader.GetInt32("MenuItemId")] = new MenuItemPrice(reader.GetDecimal("Price"));
        return items;
    }

    private static async Task<int> InsertOrderAsync(MySqlConnection connection, MySqlTransaction transaction, int customerId, int tableId, string idempotencyKey, decimal total, CancellationToken cancellationToken)
    {
        const string sql = "INSERT INTO DineInOrders (CustomerId, TableId, IdempotencyKey, Status, TotalAmount) VALUES (@CustomerId, @TableId, @IdempotencyKey, 'Received', @TotalAmount); SELECT LAST_INSERT_ID();";
        await using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@TableId", tableId);
        command.Parameters.AddWithValue("@IdempotencyKey", idempotencyKey);
        command.Parameters.AddWithValue("@TotalAmount", total);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }

    private static async Task InsertOrderItemsAsync(MySqlConnection connection, MySqlTransaction transaction, int orderId, IEnumerable<DineInOrderItemRequest> items, IReadOnlyDictionary<int, MenuItemPrice> menuItems, CancellationToken cancellationToken)
    {
        const string sql = "INSERT INTO DineInOrderItems (OrderId, MenuItemId, Quantity, UnitPrice) VALUES (@OrderId, @MenuItemId, @Quantity, @UnitPrice);";
        foreach (var item in items)
        {
            await using var command = new MySqlCommand(sql, connection, transaction);
            command.Parameters.AddWithValue("@OrderId", orderId);
            command.Parameters.AddWithValue("@MenuItemId", item.MenuItemId);
            command.Parameters.AddWithValue("@Quantity", item.Quantity);
            command.Parameters.AddWithValue("@UnitPrice", menuItems[item.MenuItemId].Price);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<DineInOrderResponse?> FindOrderByIdempotencyKeyAsync(MySqlConnection connection, MySqlTransaction? transaction, int customerId, string idempotencyKey, CancellationToken cancellationToken)
    {
        const string sql = "SELECT OrderId, Status, TotalAmount FROM DineInOrders WHERE CustomerId = @CustomerId AND IdempotencyKey = @IdempotencyKey LIMIT 1;";
        await using var command = new MySqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@CustomerId", customerId);
        command.Parameters.AddWithValue("@IdempotencyKey", idempotencyKey);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new DineInOrderResponse(reader.GetInt32("OrderId"), $"DIN-{reader.GetInt32("OrderId"):D6}", reader.GetString("Status"), reader.GetDecimal("TotalAmount"))
            : null;
    }

    private sealed record MenuItemPrice(decimal Price);
    private sealed record DineInOrderResponse(int OrderId, string OrderReference, string Status, decimal TotalAmount);
}
