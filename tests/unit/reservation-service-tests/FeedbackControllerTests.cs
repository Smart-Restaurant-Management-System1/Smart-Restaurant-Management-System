using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class FeedbackControllerTests
{
    private readonly Mock<IFeedbackService> _serviceMock;
    private readonly Mock<ILogger<FeedbackController>> _loggerMock;
    private readonly FeedbackController _controller;

    public FeedbackControllerTests()
    {
        _serviceMock = new Mock<IFeedbackService>();
        _loggerMock = new Mock<ILogger<FeedbackController>>();
        _controller = new FeedbackController(_serviceMock.Object, _loggerMock.Object);
    }

    private void SetUser(string? userId, string? role)
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

    private static ClaimsPrincipal CreatePrincipal(string? role, string userId = "42")
    {
        if (role is null)
        {
            return new ClaimsPrincipal(new ClaimsIdentity());
        }

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, role) },
            authenticationType: "Test",
            nameType: ClaimTypes.NameIdentifier,
            roleType: ClaimTypes.Role);
        return new ClaimsPrincipal(identity);
    }

    private static async Task<bool> IsMethodAllowedAsync(string methodName, string? role)
    {
        var method = typeof(FeedbackController).GetMethod(methodName);
        Assert.NotNull(method);

        var authorizeData = method.GetCustomAttributes<AuthorizeAttribute>().ToList();
        Assert.NotEmpty(authorizeData);

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization();
        using var provider = services.BuildServiceProvider();

        var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();
        var policy = await AuthorizationPolicy.CombineAsync(policyProvider, authorizeData);
        Assert.NotNull(policy);

        var result = await provider.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(CreatePrincipal(role), null, policy!);
        return result.Succeeded;
    }

    [Fact]
    public async Task SubmitFeedback_CustomerRole_IsAuthorized()
    {
        Assert.True(await IsMethodAllowedAsync(nameof(FeedbackController.SubmitFeedback), AppRoles.Customer));
    }

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.KitchenStaff)]
    [InlineData("Unknown")]
    public async Task SubmitFeedback_NonCustomerRole_IsForbidden(string role)
    {
        Assert.False(await IsMethodAllowedAsync(nameof(FeedbackController.SubmitFeedback), role));
    }

    [Fact]
    public async Task SubmitFeedback_Unauthenticated_IsRejected()
    {
        Assert.False(await IsMethodAllowedAsync(nameof(FeedbackController.SubmitFeedback), null));
    }

    [Fact]
    public async Task GetAdminFeedback_AdminRole_IsAuthorized()
    {
        Assert.True(await IsMethodAllowedAsync(nameof(FeedbackController.GetAdminFeedback), AppRoles.Admin));
    }

    [Theory]
    [InlineData(AppRoles.Customer)]
    [InlineData(AppRoles.KitchenStaff)]
    public async Task GetAdminFeedback_NonAdminRole_IsForbidden(string role)
    {
        Assert.False(await IsMethodAllowedAsync(nameof(FeedbackController.GetAdminFeedback), role));
    }

    [Fact]
    public async Task SubmitFeedback_UnauthenticatedContext_Returns401()
    {
        SetUser(null, null);

        var result = await _controller.SubmitFeedback(new SubmitFeedbackRequest { Rating = 5 }, default);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task SubmitFeedback_ValidCustomer_Returns201Created()
    {
        SetUser("42", AppRoles.Customer);

        var responseDto = new FeedbackResponse
        {
            FeedbackId = 99,
            CustomerId = 42,
            Rating = 5,
            Comment = "Delicious!"
        };

        _serviceMock.Setup(s => s.SubmitFeedbackAsync(42, It.IsAny<SubmitFeedbackRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((responseDto, null, StatusCodes.Status201Created));

        var result = await _controller.SubmitFeedback(new SubmitFeedbackRequest { Rating = 5 }, default);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        Assert.Equal(responseDto, objectResult.Value);
    }

    [Fact]
    public async Task SubmitFeedback_ServiceError_ReturnsCorrespondingStatusCode()
    {
        SetUser("42", AppRoles.Customer);

        _serviceMock.Setup(s => s.SubmitFeedbackAsync(42, It.IsAny<SubmitFeedbackRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((null, "Feedback has already been submitted for this reservation.", StatusCodes.Status409Conflict));

        var result = await _controller.SubmitFeedback(new SubmitFeedbackRequest { Rating = 5, ReservationId = 1 }, default);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetMyFeedback_ValidCustomer_Returns200WithList()
    {
        SetUser("42", AppRoles.Customer);

        var list = new List<FeedbackResponse>
        {
            new() { FeedbackId = 1, CustomerId = 42, Rating = 5 }
        };

        _serviceMock.Setup(s => s.GetMyFeedbackAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(list);

        var result = await _controller.GetMyFeedback(default);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        Assert.Equal(list, okResult.Value);
    }

    [Fact]
    public async Task GetAdminFeedback_Returns200WithPagedResult()
    {
        SetUser("1", AppRoles.Admin);

        var paged = new FeedbackPagedResult<FeedbackResponse>
        {
            Items = new List<FeedbackResponse> { new() { FeedbackId = 1, CustomerId = 42, Rating = 5 } },
            TotalCount = 1,
            Page = 1,
            PageSize = 10
        };

        _serviceMock.Setup(s => s.GetAdminFeedbackAsync(It.IsAny<AdminFeedbackQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(paged);

        var result = await _controller.GetAdminFeedback(new AdminFeedbackQuery(), default);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        Assert.Equal(paged, okResult.Value);
    }

    [Fact]
    public async Task GetAdminSummary_Returns200WithSummary()
    {
        SetUser("1", AppRoles.Admin);

        var summary = new FeedbackSummaryResponse
        {
            AverageRating = 4.7,
            TotalFeedbacks = 20
        };

        _serviceMock.Setup(s => s.GetAdminSummaryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(summary);

        var result = await _controller.GetAdminSummary(default);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        Assert.Equal(summary, okResult.Value);
    }
}
