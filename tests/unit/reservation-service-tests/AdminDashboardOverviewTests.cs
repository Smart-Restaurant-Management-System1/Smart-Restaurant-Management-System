using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class AdminDashboardOverviewTests
{
    private readonly Mock<IAdminDashboardRepository> _repoMock;
    private readonly Mock<ILogger<AdminDashboardService>> _serviceLoggerMock;
    private readonly Mock<ILogger<AdminDashboardController>> _controllerLoggerMock;
    private readonly AdminDashboardService _service;
    private readonly AdminDashboardController _controller;

    public AdminDashboardOverviewTests()
    {
        _repoMock = new Mock<IAdminDashboardRepository>();
        _serviceLoggerMock = new Mock<ILogger<AdminDashboardService>>();
        _controllerLoggerMock = new Mock<ILogger<AdminDashboardController>>();

        _service = new AdminDashboardService(_repoMock.Object, _serviceLoggerMock.Object);
        _controller = new AdminDashboardController(_service, _controllerLoggerMock.Object);
    }

    [Fact]
    public async Task GetDashboardOverviewAsync_CombinesAllMetricsConcurrently()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        var mockUsers = new DashboardCustomerStaffMetricsDto(100, 20, 95, 18);
        var mockReservations = new DashboardReservationMetricsDto(12, 6, 50, 4, 30, 8, 8);
        var mockOrders = new DashboardOrderMetricsDto(70, 8, 6, 4, 48, 4, 45, 25);
        var mockMenu = new DashboardMenuMetricsDto(25, 23, 2, new List<CategoryMenuAvailabilityDto>());
        var mockResTrends = new List<DailyReservationTrendDto>();
        var mockOrderTrends = new List<DailyOrderTrendDto>();

        _repoMock.Setup(r => r.GetCustomerStaffMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockUsers);
        _repoMock.Setup(r => r.GetReservationMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockReservations);
        _repoMock.Setup(r => r.GetDailyReservationTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockResTrends);
        _repoMock.Setup(r => r.GetOrderMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockOrders);
        _repoMock.Setup(r => r.GetMenuMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockMenu);
        _repoMock.Setup(r => r.GetDailyOrderTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockOrderTrends);

        var result = await _service.GetDashboardOverviewAsync(from, to);

        Assert.NotNull(result);
        Assert.Equal(mockUsers, result.Users);
        Assert.Equal(mockReservations, result.Reservations);
        Assert.Equal(mockOrders, result.Orders);
        Assert.Equal(mockMenu, result.Menu);
        Assert.Equal(from, result.From);
        Assert.Equal(to, result.To);
        Assert.True(result.GeneratedAtUtc <= DateTime.UtcNow);
    }

    [Fact]
    public async Task Controller_GetDashboardOverview_ValidRequest_ReturnsOkWithUnifiedOverview()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        _repoMock.Setup(r => r.GetCustomerStaffMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardCustomerStaffMetricsDto(50, 10, 48, 9));
        _repoMock.Setup(r => r.GetReservationMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardReservationMetricsDto(10, 4, 30, 2, 20, 4, 4));
        _repoMock.Setup(r => r.GetDailyReservationTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DailyReservationTrendDto>());
        _repoMock.Setup(r => r.GetOrderMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardOrderMetricsDto(40, 5, 3, 2, 28, 2, 25, 15));
        _repoMock.Setup(r => r.GetMenuMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardMenuMetricsDto(15, 14, 1, new List<CategoryMenuAvailabilityDto>()));
        _repoMock.Setup(r => r.GetDailyOrderTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DailyOrderTrendDto>());

        var actionResult = await _controller.GetDashboardOverview(new DashboardQueryDto { From = from, To = to });

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var payload = Assert.IsType<DashboardOverviewResponseDto>(okResult.Value);
        Assert.Equal(50, payload.Users.TotalCustomers);
        Assert.Equal(10, payload.Reservations.ActiveReservations);
        Assert.Equal(40, payload.Orders.TotalOrders);
        Assert.Equal(15, payload.Menu.TotalMenuItems);
    }

    [Fact]
    public async Task Controller_GetDashboardOverview_InvalidDateRange_ReturnsBadRequest()
    {
        var actionResult = await _controller.GetDashboardOverview(new DashboardQueryDto
        {
            From = new DateOnly(2026, 10, 15),
            To = new DateOnly(2026, 10, 5)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.NotNull(badRequest.Value);
    }
}
