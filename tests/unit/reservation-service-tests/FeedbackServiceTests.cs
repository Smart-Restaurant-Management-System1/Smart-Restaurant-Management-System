using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class FeedbackServiceTests
{
    private readonly Mock<IFeedbackRepository> _repoMock;
    private readonly Mock<ILogger<FeedbackService>> _loggerMock;
    private readonly FeedbackService _service;

    public FeedbackServiceTests()
    {
        _repoMock = new Mock<IFeedbackRepository>();
        _loggerMock = new Mock<ILogger<FeedbackService>>();
        _service = new FeedbackService(_repoMock.Object, _loggerMock.Object);
    }

    [Theory]
    [InlineData(1, "Service was slow, but food was okay.")]
    [InlineData(2, "Needs better table cleaning.")]
    [InlineData(3, "Average experience overall.")]
    [InlineData(4, null)]
    [InlineData(5, null)]
    [InlineData(5, "Exceptional dining experience!")]
    public async Task SubmitFeedback_ValidInputs_Returns201Created(int rating, string? comment)
    {
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<CustomerFeedback>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(101);

        var request = new SubmitFeedbackRequest
        {
            Rating = rating,
            Comment = comment
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status201Created, statusCode);
        Assert.Null(errorMessage);
        Assert.NotNull(response);
        Assert.Equal(101, response.FeedbackId);
        Assert.Equal(42, response.CustomerId);
        Assert.Equal(rating, response.Rating);
        Assert.Equal("Customer #42", response.CustomerDisplayName);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(6)]
    [InlineData(99)]
    public async Task SubmitFeedback_InvalidRatingRange_Returns400BadRequest(int rating)
    {
        var request = new SubmitFeedbackRequest
        {
            Rating = rating,
            Comment = "Valid comment text here."
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status400BadRequest, statusCode);
        Assert.Null(response);
        Assert.Contains("between 1 and 5", errorMessage);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task SubmitFeedback_LowRatingWithoutComment_Returns400BadRequest(int rating)
    {
        var request = new SubmitFeedbackRequest
        {
            Rating = rating,
            Comment = ""
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status400BadRequest, statusCode);
        Assert.Null(response);
        Assert.Contains("comment is required", errorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SubmitFeedback_CommentTooShortForLowRating_Returns400BadRequest()
    {
        var request = new SubmitFeedbackRequest
        {
            Rating = 2,
            Comment = "bad"
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status400BadRequest, statusCode);
        Assert.Null(response);
        Assert.Contains("at least 5 characters", errorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SubmitFeedback_CommentExceeds1000Chars_Returns400BadRequest()
    {
        var request = new SubmitFeedbackRequest
        {
            Rating = 4,
            Comment = new string('A', 1001)
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status400BadRequest, statusCode);
        Assert.Null(response);
        Assert.Contains("cannot exceed 1000 characters", errorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SubmitFeedback_HtmlTagsInComment_AreSanitized()
    {
        CustomerFeedback? capturedFeedback = null;
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<CustomerFeedback>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerFeedback, CancellationToken>((cf, _) => capturedFeedback = cf)
            .ReturnsAsync(202);

        var request = new SubmitFeedbackRequest
        {
            Rating = 5,
            Comment = "<script>alert('xss')</script>Amazing dessert and service!"
        };

        var (response, _, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status201Created, statusCode);
        Assert.NotNull(capturedFeedback);
        Assert.Equal("alert('xss')Amazing dessert and service!", capturedFeedback.Comment);
        Assert.DoesNotContain("<script>", capturedFeedback.Comment);
    }

    [Fact]
    public async Task SubmitFeedback_ReservationNotOwned_Returns404NotFound()
    {
        _repoMock.Setup(r => r.ValidateReservationOwnershipAsync(12, 42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var request = new SubmitFeedbackRequest
        {
            Rating = 5,
            ReservationId = 12,
            Comment = "Loved the table!"
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status404NotFound, statusCode);
        Assert.Null(response);
        Assert.Contains("Reservation not found", errorMessage);
    }

    [Fact]
    public async Task SubmitFeedback_DuplicateReservationFeedback_Returns409Conflict()
    {
        _repoMock.Setup(r => r.ValidateReservationOwnershipAsync(12, 42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _repoMock.Setup(r => r.HasFeedbackForReservationAsync(42, 12, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var request = new SubmitFeedbackRequest
        {
            Rating = 5,
            ReservationId = 12,
            Comment = "Attempting duplicate review"
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status409Conflict, statusCode);
        Assert.Null(response);
        Assert.Contains("already been submitted", errorMessage);
    }

    [Fact]
    public async Task SubmitFeedback_OrderNotOwned_Returns404NotFound()
    {
        _repoMock.Setup(r => r.ValidateOrderOwnershipAsync(55, "DineIn", 42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var request = new SubmitFeedbackRequest
        {
            Rating = 5,
            OrderId = 55,
            OrderType = "DineIn",
            Comment = "Great pasta!"
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status404NotFound, statusCode);
        Assert.Null(response);
        Assert.Contains("Order not found", errorMessage);
    }

    [Fact]
    public async Task SubmitFeedback_DuplicateOrderFeedback_Returns409Conflict()
    {
        _repoMock.Setup(r => r.ValidateOrderOwnershipAsync(55, "DineIn", 42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _repoMock.Setup(r => r.HasFeedbackForOrderAsync(42, 55, "DineIn", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var request = new SubmitFeedbackRequest
        {
            Rating = 5,
            OrderId = 55,
            OrderType = "DineIn",
            Comment = "Duplicate order review"
        };

        var (response, errorMessage, statusCode) = await _service.SubmitFeedbackAsync(42, request);

        Assert.Equal(StatusCodes.Status409Conflict, statusCode);
        Assert.Null(response);
        Assert.Contains("already been submitted", errorMessage);
    }

    [Fact]
    public async Task GetMyFeedback_InvalidCustomer_ReturnsEmpty()
    {
        var result = await _service.GetMyFeedbackAsync(0);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetMyFeedback_ValidCustomer_QueriesRepo()
    {
        var list = new List<FeedbackResponse>
        {
            new() { FeedbackId = 1, CustomerId = 42, Rating = 5, Comment = "Superb" }
        };
        _repoMock.Setup(r => r.GetForCustomerAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(list);

        var result = await _service.GetMyFeedbackAsync(42);

        Assert.Single(result);
        Assert.Equal(1, result[0].FeedbackId);
    }

    [Fact]
    public async Task GetAdminFeedback_DelegatesToRepo()
    {
        var pagedResult = new FeedbackPagedResult<FeedbackResponse>
        {
            Items = new List<FeedbackResponse>
            {
                new() { FeedbackId = 1, CustomerId = 42, Rating = 5, Comment = "Admin check" }
            },
            TotalCount = 1,
            Page = 1,
            PageSize = 10
        };
        _repoMock.Setup(r => r.GetForAdminAsync(It.IsAny<AdminFeedbackQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(pagedResult);

        var result = await _service.GetAdminFeedbackAsync(new AdminFeedbackQuery());

        Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task GetAdminSummary_DelegatesToRepo()
    {
        var summary = new FeedbackSummaryResponse
        {
            AverageRating = 4.8,
            TotalFeedbacks = 15,
            RatingDistribution = new Dictionary<int, int> { [5] = 12, [4] = 3 }
        };
        _repoMock.Setup(r => r.GetSummaryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(summary);

        var result = await _service.GetAdminSummaryAsync();

        Assert.Equal(4.8, result.AverageRating);
        Assert.Equal(15, result.TotalFeedbacks);
    }
}
