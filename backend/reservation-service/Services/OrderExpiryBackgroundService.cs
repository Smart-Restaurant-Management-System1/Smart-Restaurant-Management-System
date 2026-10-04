using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ReservationService.Models;

namespace ReservationService.Services;

public sealed class OrderExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly OrderExpiryOptions _options;
    private readonly ILogger<OrderExpiryBackgroundService> _logger;

    public OrderExpiryBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptions<OrderExpiryOptions> options,
        ILogger<OrderExpiryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "OrderExpiryBackgroundService started. Enabled={Enabled}, Interval={Interval}m, Threshold={Threshold}m.",
            _options.Enabled, _options.PollIntervalMinutes, _options.ExpiryThresholdMinutes);

        if (!_options.Enabled)
        {
            _logger.LogInformation("OrderExpiryBackgroundService is disabled by configuration.");
            return;
        }

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var expiryService = scope.ServiceProvider.GetRequiredService<IOrderExpiryService>();

                var result = await expiryService.ExpireUnpaidOrdersAsync(
                    _options.ExpiryThresholdMinutes,
                    stoppingToken);

                if (result.TotalExpired > 0)
                {
                    _logger.LogInformation(
                        "OrderExpiryBackgroundService sweep completed: {DineInCount} dine-in and {PreOrderCount} pre-orders expired. References: [{References}]",
                        result.ExpiredDineInOrdersCount,
                        result.ExpiredPreOrdersCount,
                        string.Join(", ", result.ExpiredOrderReferences));
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in OrderExpiryBackgroundService execution cycle.");
            }

            try
            {
                var interval = TimeSpan.FromMinutes(Math.Max(1, _options.PollIntervalMinutes));
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("OrderExpiryBackgroundService stopped.");
    }
}
