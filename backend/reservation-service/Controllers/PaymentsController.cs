using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IUserAccountStatusValidator _userAccountStatusValidator;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentService paymentService,
        IUserAccountStatusValidator userAccountStatusValidator,
        ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _userAccountStatusValidator = userAccountStatusValidator;
        _logger = logger;
    }

    /// <summary>
    /// SR-280 / SR-283: Customer initiates online payment checkout via PayHere Sandbox.
    /// Only OrderType and OrderId are accepted; CustomerId and Amount are calculated authoritatively.
    /// </summary>
    [HttpPost("checkout")]
    [Authorize(Policy = AppPolicies.RequireCustomer)]
    [ProducesResponseType(typeof(PayHereCheckoutResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateCheckout(
        [FromBody] PaymentCheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "Valid customer identity is required." });
        }

        if (!await _userAccountStatusValidator.IsUserActiveAsync(customerId, cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is deactivated or blocked." });
        }

        try
        {
            var response = await _paymentService.CreatePayHereCheckoutAsync(customerId, request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Request cash settlement at the restaurant counter or table.
    /// </summary>
    [HttpPost("cash")]
    [Authorize(Policy = AppPolicies.RequireCustomer)]
    [ProducesResponseType(typeof(PaymentStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RequestCashPayment(
        [FromBody] CashPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "Valid customer identity is required." });
        }

        if (!await _userAccountStatusValidator.IsUserActiveAsync(customerId, cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is deactivated or blocked." });
        }

        try
        {
            var response = await _paymentService.RequestCashPaymentAsync(customerId, request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit bank transfer slip image for verification.
    /// </summary>
    [HttpPost("bank-transfer")]
    [Authorize(Policy = AppPolicies.RequireCustomer)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(PaymentStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SubmitBankTransferSlip(
        [FromForm] BankTransferPaymentFormRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var customerId))
        {
            return Unauthorized(new { message = "Valid customer identity is required." });
        }

        if (!await _userAccountStatusValidator.IsUserActiveAsync(customerId, cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is deactivated or blocked." });
        }

        try
        {
            var response = await _paymentService.SubmitBankTransferSlipAsync(customerId, request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// SR-280 / SR-284: Server-to-server webhook endpoint called by PayHere.
    /// Validates md5sig signature, merchant ID, amount, and updates payment idempotently.
    /// </summary>
    [HttpPost("payhere/notify")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessPayHereNotify(
        [FromForm] PayHereNotifyForm form,
        CancellationToken cancellationToken)
    {
        var isSuccess = await _paymentService.ProcessPayHereNotificationAsync(form, cancellationToken);
        if (isSuccess)
        {
            return Ok();
        }

        return BadRequest("Invalid notification signature or parameters.");
    }

    /// <summary>
    /// Retrieve payment status for a specific order. Accessible to owning customer or staff.
    /// </summary>
    [HttpGet("order/{orderType}/{orderId:int}")]
    [Authorize]
    [ProducesResponseType(typeof(PaymentStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentStatus(
        string orderType,
        int orderId,
        CancellationToken cancellationToken)
    {
        TryGetCustomerId(out var customerId);
        var isStaff = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.KitchenStaff);

        try
        {
            var payment = await _paymentService.GetPaymentStatusForOrderAsync(
                customerId,
                orderType,
                orderId,
                isStaff,
                cancellationToken);

            if (payment == null)
            {
                return NotFound(new { message = $"No payment record found for {orderType} order #{orderId}." });
            }

            return Ok(payment);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieve all pending cash and bank transfer settlements requiring verification (Staff only).
    /// </summary>
    [HttpGet("pending-verifications")]
    [Authorize(Policy = AppPolicies.RequireStaff)]
    [ProducesResponseType(typeof(IReadOnlyList<PaymentStatusResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingVerifications(CancellationToken cancellationToken)
    {
        var results = await _paymentService.GetPendingVerificationsAsync(cancellationToken);
        return Ok(results);
    }

    /// <summary>
    /// Retrieve payment history for administration and verification audit (Staff only).
    /// </summary>
    [HttpGet("history")]
    [Authorize(Policy = AppPolicies.RequireStaff)]
    [ProducesResponseType(typeof(IReadOnlyList<PaymentStatusResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentHistory(
        [FromQuery] string? status = null,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var results = await _paymentService.GetPaymentHistoryAsync(status, limit, cancellationToken);
        return Ok(results);
    }

    /// <summary>
    /// Verify or reject a pending cash or bank transfer payment (Staff only).
    /// </summary>
    [HttpPatch("{paymentId:int}/verify")]
    [Authorize(Policy = AppPolicies.RequireStaff)]
    [ProducesResponseType(typeof(PaymentStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> VerifyPayment(
        int paymentId,
        [FromBody] VerifyPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCustomerId(out var staffUserId))
        {
            return Unauthorized(new { message = "Valid staff user identity is required." });
        }

        try
        {
            var result = await _paymentService.VerifyPaymentAsync(staffUserId, paymentId, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private bool TryGetCustomerId(out int customerId)
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub")?.Value;
        return int.TryParse(idClaim, out customerId) && customerId > 0;
    }
}
