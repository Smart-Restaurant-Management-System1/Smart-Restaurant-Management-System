
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/order-cart")]
[Authorize(Roles = AppRoles.Customer)]
public class OrderCartController : ControllerBase
{
    private readonly IOrderCartService _cartService;

    public OrderCartController(IOrderCartService cartService)
    {
        _cartService = cartService;
    }

    /// <summary>
    /// Gets the authenticated customer's order cart.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(OrderCart), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCart(
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        var cart = await _cartService.GetCartAsync(
            customerId,
            cancellationToken);

        if (cart == null)
        {
            return Ok(new OrderCart
            {
                CustomerId = customerId
            });
        }

        return Ok(cart);
    }

    /// <summary>
    /// Adds a menu item to the authenticated customer's cart.
    /// </summary>
    [HttpPost("items")]
    [ProducesResponseType(typeof(OrderCart), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddItem(
        [FromBody] AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        try
        {
            var cart = await _cartService.AddItemAsync(
                customerId,
                request.MenuItemId,
                request.Quantity,
                cancellationToken);

            return Ok(cart);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new
            {
                message = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new
            {
                message = exception.Message
            });
        }
    }

    /// <summary>
    /// Updates the quantity of a menu item in the cart.
    /// </summary>
    [HttpPut("items/{menuItemId:int}")]
    [ProducesResponseType(typeof(OrderCart), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateItemQuantity(
        int menuItemId,
        [FromBody] UpdateCartItemRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        try
        {
            var cart = await _cartService.UpdateItemQuantityAsync(
                customerId,
                menuItemId,
                request.Quantity,
                cancellationToken);

            return Ok(cart);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new
            {
                message = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new
            {
                message = exception.Message
            });
        }
    }

    /// <summary>
    /// Removes a menu item from the cart.
    /// </summary>
    [HttpDelete("items/{menuItemId:int}")]
    [ProducesResponseType(typeof(OrderCart), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveItem(
        int menuItemId,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        try
        {
            var cart = await _cartService.RemoveItemAsync(
                customerId,
                menuItemId,
                cancellationToken);

            return Ok(cart);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new
            {
                message = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new
            {
                message = exception.Message
            });
        }
    }

    /// <summary>
    /// Removes all items from the authenticated customer's cart.
    /// </summary>
    [HttpDelete]
    [ProducesResponseType(typeof(OrderCart), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ClearCart(
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new
            {
                message = "A valid customer identity is required."
            });
        }

        var cart = await _cartService.ClearCartAsync(
            customerId,
            cancellationToken);

        return Ok(cart);
    }

    private bool TryGetCustomerId(out int customerId)
    {
        var customerIdClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        return int.TryParse(
            customerIdClaim,
            out customerId) &&
            customerId > 0;
    }
}

public sealed class AddCartItemRequest
{
    public int MenuItemId { get; set; }

    public int Quantity { get; set; }
}

public sealed class UpdateCartItemRequest
{
    public int Quantity { get; set; }
}