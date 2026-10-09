using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class AdminOrderSearchAndExportTests
{
    private static AdminOrdersController CreateController(
        Mock<IAdminOrderService> orderServiceMock,
        string role = AppRoles.Admin)
    {
        var mockLogger = new Mock<ILogger<AdminOrdersController>>();

        var controller = new AdminOrdersController(
            orderServiceMock.Object,
            mockLogger.Object);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(ClaimTypes.Email, "staff@cinnamonbistro.com"),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }

    [Fact]
    public async Task SearchOrders_ValidQuery_ReturnsOkWithOrders()
    {
        var mockService = new Mock<IAdminOrderService>();
        var sampleOrders = new List<AdminOrderItemDto>
        {
            new()
            {
                OrderId = 501,
                OrderReference = "DIN-000501",
                OrderType = "DineIn",
                TableId = 3,
                TableNumber = "T-03",
                CustomerId = 15,
                CustomerName = "Nimal Perera",
                CustomerEmail = "nimal@test.lk",
                CustomerPhone = "0711122334",
                Status = "InPreparation",
                TotalAmount = 4500.00m,
                PaymentStatus = "Paid",
                PaymentMethod = "PayHere",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        var responseDto = new AdminOrderResponseDto
        {
            Items = sampleOrders,
            Page = 1,
            PageSize = 20,
            TotalCount = 1,
            TotalPages = 1
        };

        mockService.Setup(s => s.SearchOrdersAsync(It.IsAny<AdminOrderQueryDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(responseDto);

        var controller = CreateController(mockService);
        var result = await controller.SearchOrders(new AdminOrderQueryDto
        {
            OrderReference = "DIN-000501",
            Page = 1,
            PageSize = 20
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrderResponseDto>(okResult.Value);
        Assert.Single(response.Items);
        Assert.Equal("DIN-000501", response.Items[0].OrderReference);
        Assert.Equal("Nimal Perera", response.Items[0].CustomerName);
    }

    [Fact]
    public async Task SearchOrders_InvalidDateRange_FromAfterTo_Returns400()
    {
        var mockService = new Mock<IAdminOrderService>();
        var controller = CreateController(mockService);

        var result = await controller.SearchOrders(new AdminOrderQueryDto
        {
            DateFrom = new DateOnly(2026, 10, 20),
            DateTo = new DateOnly(2026, 10, 10)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.True(problem.Errors.ContainsKey("dateTo"));
    }

    [Fact]
    public async Task SearchOrders_DateRangeExceeds90Days_Returns400()
    {
        var mockService = new Mock<IAdminOrderService>();
        var controller = CreateController(mockService);

        var result = await controller.SearchOrders(new AdminOrderQueryDto
        {
            DateFrom = new DateOnly(2026, 1, 1),
            DateTo = new DateOnly(2026, 6, 1)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.True(problem.Errors.ContainsKey("dateTo"));
    }

    [Fact]
    public async Task ExportOrders_ValidQuery_ReturnsCsvFileResult()
    {
        var mockService = new Mock<IAdminOrderService>();
        var csvBytes = Encoding.UTF8.GetBytes("Order Reference,Order Type,Total\nDIN-000001,DineIn,2500.00");

        mockService.Setup(s => s.ExportOrdersToCsvAsync(It.IsAny<AdminOrderQueryDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(csvBytes);

        var controller = CreateController(mockService);
        var result = await controller.ExportOrders(new AdminOrderQueryDto
        {
            OrderType = "DineIn"
        });

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", fileResult.ContentType);
        Assert.EndsWith(".csv", fileResult.FileDownloadName);
    }

    [Fact]
    public void AdminOrdersController_RBAC_EnforcesRequireStaffPolicy()
    {
        var authAttr = typeof(AdminOrdersController).GetCustomAttributes(typeof(AuthorizeAttribute), false)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        Assert.NotNull(authAttr);
        Assert.Equal(AppPolicies.RequireStaff, authAttr.Policy);
    }
}

