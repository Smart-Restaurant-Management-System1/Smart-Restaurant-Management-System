using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class AdminDashboardOrderMetricsTests
{
    private readonly Mock<IAdminDashboardRepository> _repoMock;
    private readonly Mock<ILogger<AdminDashboardService>> _serviceLoggerMock;
    private readonly Mock<ILogger<AdminDashboardController>> _controllerLoggerMock;
    private readonly AdminDashboardService _service;
    private readonly AdminDashboardController _controller;

    public AdminDashboardOrderMetricsTests()
    {
        _repoMock = new Mock<IAdminDashboardRepository>();
        _serviceLoggerMock = new Mock<ILogger<AdminDashboardService>>();
        _controllerLoggerMock = new Mock<ILogger<AdminDashboardController>>();

        _service = new AdminDashboardService(_repoMock.Object, _serviceLoggerMock.Object);
        _controller = new AdminDashboardController(_service, _controllerLoggerMock.Object);
    }

    [Fact]
    public async Task GetOrdersSummaryAsync_ReturnsCombinedOrderAndMenuMetrics()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        var mockOrders = new DashboardOrderMetricsDto(
            TotalOrders: 85,
            PendingOrders: 10,
            PreparingOrders: 8,
            ReadyOrders: 4,
            ServedOrders: 58,
            CancelledOrders: 5,
            TotalDineInOrders: 55,
            TotalPreOrders: 30
        );

        var mockCategories = new List<CategoryMenuAvailabilityDto>
        {
            new("Appetizer", 6, 5, 1),
            new("Main Course", 12, 11, 1),
            new("Dessert", 4, 4, 0),
            new("Beverage", 8, 7, 1)
        };

        var mockMenu = new DashboardMenuMetricsDto(
            TotalMenuItems: 30,
            AvailableMenuItems: 27,
            UnavailableMenuItems: 3,
            Categories: mockCategories
        );

        var mockTrends = new List<DailyOrderTrendDto>
        {
            new(new DateOnly(2026, 10, 1), 12, 8, 4, 10, 1),
            new(new DateOnly(2026, 10, 2), 15, 10, 5, 13, 0)
        };

        _repoMock.Setup(r => r.GetOrderMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockOrders);
        _repoMock.Setup(r => r.GetMenuMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockMenu);
        _repoMock.Setup(r => r.GetDailyOrderTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockTrends);

        var result = await _service.GetOrdersSummaryAsync(from, to);

        Assert.NotNull(result);
        Assert.Equal(mockOrders, result.Orders);
        Assert.Equal(mockMenu, result.Menu);
        Assert.Equal(mockTrends, result.DailyTrends);
        Assert.Equal(from, result.From);
        Assert.Equal(to, result.To);
    }

    [Fact]
    public async Task Controller_GetOrdersSummary_ValidRequest_ReturnsOkWithData()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        _repoMock.Setup(r => r.GetOrderMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardOrderMetricsDto(50, 5, 3, 2, 38, 2, 30, 20));
        _repoMock.Setup(r => r.GetMenuMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardMenuMetricsDto(20, 18, 2, new List<CategoryMenuAvailabilityDto>()));
        _repoMock.Setup(r => r.GetDailyOrderTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DailyOrderTrendDto>());

        var actionResult = await _controller.GetOrdersSummary(new DashboardQueryDto { From = from, To = to });

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var payload = Assert.IsType<DashboardOrdersSummaryDto>(okResult.Value);
        Assert.Equal(50, payload.Orders.TotalOrders);
        Assert.Equal(20, payload.Menu.TotalMenuItems);
    }

    [Fact]
    public async Task Controller_GetOrdersSummary_InvalidRange_ReturnsBadRequest()
    {
        var actionResult = await _controller.GetOrdersSummary(new DashboardQueryDto
        {
            From = new DateOnly(2026, 10, 20),
            To = new DateOnly(2026, 10, 10)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.NotNull(badRequest.Value);
    }
}

