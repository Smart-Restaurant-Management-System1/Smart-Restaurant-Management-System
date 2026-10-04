using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ReservationService.Data;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class OrderExpiryTests
{
    private static DatabaseHelper CreateTestDatabaseHelper()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Port=3307;Database=restaurant_reservation_db;User=root;Password=test;"
            })
            .Build();

        return new DatabaseHelper(config);
    }

    [Fact]
    public void OrderExpiryOptions_DefaultValues_AreExpected()
    {
        var options = new OrderExpiryOptions();

        Assert.True(options.Enabled);
        Assert.Equal(2, options.PollIntervalMinutes);
        Assert.Equal(30, options.ExpiryThresholdMinutes);
    }

    [Fact]
    public void OrderExpiryResult_TotalExpired_SumsDineInAndPreOrdersCorrectly()
    {
        var result = new OrderExpiryResult
        {
            ExpiredDineInOrdersCount = 3,
            ExpiredPreOrdersCount = 2,
            ExpiredOrderReferences = new List<string> { "DIN-000001", "DIN-000002", "DIN-000003", "PRE-000001", "PRE-000002" }
        };

        Assert.Equal(5, result.TotalExpired);
        Assert.Equal(5, result.ExpiredOrderReferences.Count);
        Assert.Contains("DIN-000001", result.ExpiredOrderReferences);
        Assert.Contains("PRE-000002", result.ExpiredOrderReferences);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-30)]
    public async Task OrderExpiryService_ThrowsArgumentOutOfRangeException_WhenThresholdNonPositive(int invalidThreshold)
    {
        var dbHelper = CreateTestDatabaseHelper();
        var outboxRepo = new Mock<IOutboxRepository>();
        var logger = new Mock<ILogger<OrderExpiryService>>();

        var service = new OrderExpiryService(dbHelper, outboxRepo.Object, logger.Object);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            service.ExpireUnpaidOrdersAsync(invalidThreshold));
    }

    [Fact]
    public async Task OrderExpiryBackgroundService_WhenDisabled_ExitsWithoutInvokingService()
    {
        var mockScopeFactory = new Mock<IServiceScopeFactory>();
        var options = Options.Create(new OrderExpiryOptions
        {
            Enabled = false,
            PollIntervalMinutes = 1,
            ExpiryThresholdMinutes = 30
        });
        var logger = new Mock<ILogger<OrderExpiryBackgroundService>>();

        var backgroundService = new OrderExpiryBackgroundService(
            mockScopeFactory.Object,
            options,
            logger.Object);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
        await backgroundService.StartAsync(cts.Token);
        await backgroundService.StopAsync(CancellationToken.None);

        mockScopeFactory.Verify(f => f.CreateScope(), Times.Never);
    }

    [Fact]
    public void OrderLifecycleEventTypes_DefinesOrderCancelled()
    {
        Assert.Equal("OrderCancelled", OrderLifecycleEventTypes.OrderCancelled);
    }
}
