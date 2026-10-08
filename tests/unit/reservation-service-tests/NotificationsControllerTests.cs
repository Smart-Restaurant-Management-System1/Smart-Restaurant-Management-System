using System.Reflection;
using System.Security.Claims;
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

public sealed class NotificationsControllerTests
{
    private readonly Mock<INotificationService> _serviceMock;
    private readonly Mock<ILogger<NotificationsController>> _loggerMock;
    private readonly NotificationsController _controller;

    public NotificationsControllerTests()
    {
        _serviceMock = new Mock<INotificationService>();
        _loggerMock = new Mock<ILogger<NotificationsController>>();
        _controller = new NotificationsController(_serviceMock.Object, _loggerMock.Object);
    }

    private void SetUser(string? userId, string? role = AppRoles.Customer)
    {
        if (userId is null)
        {
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };
            return;
        }

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
        if (role is not null)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth", ClaimTypes.NameIdentifier, ClaimTypes.Role);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public void Controller_HasCustomerOnlyAuthorizationAttribute()
    {
        var authAttr = typeof(NotificationsController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal(AppRoles.Customer, authAttr.Roles);
    }

    [Fact]
    public async Task GetNotifications_Unauthenticated_ReturnsUnauthorized()
    {
        SetUser(null);
        var result = await _controller.GetNotifications(1, 10, false, CancellationToken.None);
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task GetNotifications_AuthenticatedCustomer_ReturnsOkWithList()
    {
        SetUser("42");
        var expectedDto = new NotificationListResponseDto(
            new List<NotificationResponseDto>
            {
                new(1, NotificationEventTypes.ReservationCreated, "Reservation Confirmed", "Your reservation #RES-001 is confirmed", "Reservation", 10, "RES-001", false, null, DateTime.UtcNow)
            },
            1, 1, 1, 10, 1
        );

        _serviceMock.Setup(s => s.GetCustomerNotificationsAsync(42, 1, 10, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedDto);

        var result = await _controller.GetNotifications(1, 10, false, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<NotificationListResponseDto>(okResult.Value);
        Assert.Equal(1, dto.TotalCount);
        Assert.Equal(1, dto.UnreadCount);
        Assert.Single(dto.Notifications);
    }

    [Fact]
    public async Task GetUnreadCount_AuthenticatedCustomer_ReturnsCount()
    {
        SetUser("42");
        _serviceMock.Setup(s => s.GetUnreadCountAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        var result = await _controller.GetUnreadCount(CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task MarkAsRead_OwnedNotification_ReturnsOk()
    {
        SetUser("42");
        _serviceMock.Setup(s => s.MarkAsReadAsync(42, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _controller.MarkAsRead(1, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task MarkAsRead_NotOwnedOrMissing_ReturnsNotFoundWithoutRevealingExistence()
    {
        SetUser("42");
        // Notification 99 belongs to Customer 99, so for Customer 42 it returns false
        _serviceMock.Setup(s => s.MarkAsReadAsync(42, 99, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _controller.MarkAsRead(99, CancellationToken.None);
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.NotNull(notFoundResult.Value);
    }

    [Fact]
    public async Task MarkAllAsRead_AuthenticatedCustomer_ReturnsOkWithCount()
    {
        SetUser("42");
        _serviceMock.Setup(s => s.MarkAllAsReadAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        var result = await _controller.MarkAllAsRead(CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }
}

