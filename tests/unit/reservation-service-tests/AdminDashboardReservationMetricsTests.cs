using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class AdminDashboardReservationMetricsTests
{
    private readonly Mock<IAdminDashboardRepository> _repoMock;
    private readonly Mock<ILogger<AdminDashboardService>> _serviceLoggerMock;
    private readonly Mock<ILogger<AdminDashboardController>> _controllerLoggerMock;
    private readonly AdminDashboardService _service;
    private readonly AdminDashboardController _controller;

    public AdminDashboardReservationMetricsTests()
    {
        _repoMock = new Mock<IAdminDashboardRepository>();
        _serviceLoggerMock = new Mock<ILogger<AdminDashboardService>>();
        _controllerLoggerMock = new Mock<ILogger<AdminDashboardController>>();

        _service = new AdminDashboardService(_repoMock.Object, _serviceLoggerMock.Object);
        _controller = new AdminDashboardController(_service, _controllerLoggerMock.Object);
    }

    [Fact]
    public void Controller_HasAdminOnlyAuthorizationAttribute()
    {
        var authAttr = typeof(AdminDashboardController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal(AppRoles.Admin, authAttr.Roles);
    }

    [Fact]
    public void ValidateAndResolveDateRange_NullRange_DefaultsToSevenDaysEndingToday()
    {
        var (from, to, error) = _service.ValidateAndResolveDateRange(null, null);

        Assert.Null(error);
        Assert.True(to >= from);
        Assert.Equal(6, to.DayNumber - from.DayNumber); // 7-day inclusive span
    }

    [Fact]
    public void ValidateAndResolveDateRange_ValidCustomRange_ReturnsCleanly()
    {
        var customFrom = new DateOnly(2026, 10, 1);
        var customTo = new DateOnly(2026, 10, 7);

        var (from, to, error) = _service.ValidateAndResolveDateRange(customFrom, customTo);

        Assert.Null(error);
        Assert.Equal(customFrom, from);
        Assert.Equal(customTo, to);
    }

    [Fact]
    public void ValidateAndResolveDateRange_ReversedRange_ReturnsValidationError()
    {
        var customFrom = new DateOnly(2026, 10, 15);
        var customTo = new DateOnly(2026, 10, 5);

        var (_, _, error) = _service.ValidateAndResolveDateRange(customFrom, customTo);

        Assert.NotNull(error);
        Assert.Contains("From date must not be later than To date", error);
    }

    [Fact]
    public void ValidateAndResolveDateRange_Exceeds90Days_ReturnsValidationError()
    {
        var customFrom = new DateOnly(2026, 1, 1);
        var customTo = new DateOnly(2026, 5, 1); // ~120 days

        var (_, _, error) = _service.ValidateAndResolveDateRange(customFrom, customTo);

        Assert.NotNull(error);
        Assert.Contains("Date range cannot exceed 90 days", error);
    }

    [Fact]
    public async Task GetReservationsSummaryAsync_ReturnsCombinedMetricsAndTrends()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        var mockUsers = new DashboardCustomerStaffMetricsDto(
            TotalCustomers: 45,
            TotalStaff: 12,
            ActiveCustomers: 40,
            ActiveStaff: 10
        );

        var mockReservations = new DashboardReservationMetricsDto(
            ActiveReservations: 15,
            TodaysReservations: 8,
            TotalReservations: 60,
            PendingReservations: 5,
            ConfirmedReservations: 35,
            CancelledReservations: 10,
            CompletedReservations: 10
        );

        var mockTrends = new List<DailyReservationTrendDto>
        {
            new(new DateOnly(2026, 10, 1), 10, 6, 2, 1, 1),
            new(new DateOnly(2026, 10, 2), 8, 5, 1, 1, 1)
        };

        _repoMock.Setup(r => r.GetCustomerStaffMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockUsers);
        _repoMock.Setup(r => r.GetReservationMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockReservations);
        _repoMock.Setup(r => r.GetDailyReservationTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockTrends);

        var result = await _service.GetReservationsSummaryAsync(from, to);

        Assert.NotNull(result);
        Assert.Equal(mockUsers, result.Users);
        Assert.Equal(mockReservations, result.Reservations);
        Assert.Equal(mockTrends, result.DailyTrends);
        Assert.Equal(from, result.From);
        Assert.Equal(to, result.To);
    }

    [Fact]
    public async Task Controller_GetReservationsSummary_ValidRequest_ReturnsOkWithData()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 7);

        _repoMock.Setup(r => r.GetCustomerStaffMetricsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardCustomerStaffMetricsDto(10, 5, 8, 4));
        _repoMock.Setup(r => r.GetReservationMetricsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardReservationMetricsDto(5, 2, 20, 2, 10, 4, 4));
        _repoMock.Setup(r => r.GetDailyReservationTrendsAsync(from, to, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DailyReservationTrendDto>());

        var actionResult = await _controller.GetReservationsSummary(new DashboardQueryDto { From = from, To = to });

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var payload = Assert.IsType<DashboardReservationsSummaryDto>(okResult.Value);
        Assert.Equal(10, payload.Users.TotalCustomers);
        Assert.Equal(5, payload.Reservations.ActiveReservations);
    }

    [Fact]
    public async Task Controller_GetReservationsSummary_InvalidRange_ReturnsBadRequest()
    {
        var actionResult = await _controller.GetReservationsSummary(new DashboardQueryDto
        {
            From = new DateOnly(2026, 10, 10),
            To = new DateOnly(2026, 10, 1)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.NotNull(badRequest.Value);
    }
}

