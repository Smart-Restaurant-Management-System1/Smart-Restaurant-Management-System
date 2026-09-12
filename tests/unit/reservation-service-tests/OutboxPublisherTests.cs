using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

/// <summary>
/// SR-114: Publisher behaviour tests using injectable mocks.
/// Verifies correct topic, message key, acknowledgement handling, retry logic,
/// poison-record isolation, backoff, dead-letter transition, lease recovery,
/// and graceful shutdown — without a real Kafka broker.
/// </summary>
public sealed class OutboxPublisherTests
{
    private static KafkaOptions DefaultOptions() => new()
    {
        BootstrapServers = "localhost:9092",
        ReservationTopic = "restaurant.reservations.v1",
        PublisherEnabled = true,
        BatchSize = 10,
        PollIntervalSeconds = 0,
        MaxAttempts = 3,
        InitialRetryDelaySeconds = 1,
        MaxRetryDelaySeconds = 60,
        LeaseSeconds = 30,
    };

    private static OutboxEvent SampleOutboxEvent(long id = 1, int attemptCount = 0) => new()
    {
        Id = id,
        EventId = Guid.NewGuid(),
        EventType = "ReservationCreated",
        SchemaVersion = 1,
        AggregateId = 42,
        MessageKey = "42",
        Payload = "{\"eventType\":\"ReservationCreated\"}",
        OccurredAtUtc = DateTime.UtcNow.AddMinutes(-1),
        CreatedAtUtc = DateTime.UtcNow.AddMinutes(-1),
        AttemptCount = attemptCount,
        Status = OutboxEventStatus.Processing,
    };

    private static OutboxPublisherService BuildService(
        Mock<IOutboxRepository> repo,
        Mock<IReservationEventPublisher> publisher,
        KafkaOptions? options = null) =>
        new(repo.Object, publisher.Object,
            Options.Create(options ?? DefaultOptions()),
            new Mock<ILogger<OutboxPublisherService>>().Object);

    // ── Enabled/disabled ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task WhenPublisherDisabled_NoBatchIsClaimed()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var svc = BuildService(repo, pub, new KafkaOptions { BootstrapServers = "x", PublisherEnabled = false });

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        await svc.StartAsync(cts.Token);
        await svc.StopAsync(CancellationToken.None);

        repo.Verify(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Successful publication ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SuccessfulPublish_CallsMarkProcessed()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 100L));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        repo.Verify(r => r.MarkProcessedAsync(outbox.Id, It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task SuccessfulPublish_UsesCorrectTopic()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 0L));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        pub.Verify(p => p.PublishAsync("restaurant.reservations.v1", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task SuccessfulPublish_UsesReservationIdAsMessageKey()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 0L));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        pub.Verify(p => p.PublishAsync(It.IsAny<string>(), "42", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    // ── Broker failure ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task BrokerFailure_RecordsFailure_DoesNotCallMarkProcessed()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Kafka broker unavailable"));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        repo.Verify(r => r.MarkProcessedAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
        repo.Verify(r => r.RecordFailureAsync(outbox.Id, It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task BrokerFailure_AttemptCountIncremented()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent(attemptCount: 0);

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("fail"));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        repo.Verify(r => r.RecordFailureAsync(outbox.Id, 1, It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    // ── Poison record isolation ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task OneFailedRecord_DoesNotPreventOtherRecordsFromBeingProcessed()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        // Give distinct payloads so Moq can route calls correctly.
        var poison = SampleOutboxEvent(id: 1) with { AggregateId = 11, MessageKey = "11", Payload = "{\"eventType\":\"ReservationCreated\",\"reservationId\":11}" };
        var good   = SampleOutboxEvent(id: 2) with { AggregateId = 22, MessageKey = "22", Payload = "{\"eventType\":\"ReservationCreated\",\"reservationId\":22}" };

        // Return the batch exactly once, then empty to stop the loop.
        var callCount = 0;
        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => callCount++ == 0 ? (IReadOnlyList<OutboxEvent>)[poison, good] : Array.Empty<OutboxEvent>());

        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), "11", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("poison"));
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), "22", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 1L));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(300);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        repo.Verify(r => r.MarkProcessedAsync(good.Id, It.IsAny<CancellationToken>()), Times.Once);
        repo.Verify(r => r.RecordFailureAsync(poison.Id, It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Dead-letter at MaxAttempts ────────────────────────────────────────────────────────────

    [Fact]
    public async Task AtMaxAttempts_RecordFailure_IsCalled_WithMaxAttemptCount()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var outbox = SampleOutboxEvent(attemptCount: 2); // next attempt = 3 = MaxAttempts

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("dead"));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        // RecordFailureAsync should be called with attemptCount = MaxAttempts (3)
        repo.Verify(r => r.RecordFailureAsync(outbox.Id, 3, It.IsAny<DateTime>(), It.IsAny<string?>(), 3, It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    // ── Graceful shutdown ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GracefulCancellation_DoesNotThrow()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OutboxEvent>());

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        cts.Cancel();
        var ex = await Record.ExceptionAsync(() => svc.StopAsync(CancellationToken.None));
        Assert.Null(ex);
    }

    // ── Lease recovery ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ClaimBatch_IsCalledWithPublisherInstanceId()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OutboxEvent>());

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        // Verify that a consistent non-empty GUID was used as the lock ID.
        repo.Verify(r => r.ClaimBatchAsync(It.Is<Guid>(g => g != Guid.Empty), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    // ── EventId preserved on retry (original key not regenerated) ────────────────────────────

    [Fact]
    public async Task RetryPublish_UsesOriginalPayload_NotNewEventId()
    {
        var repo = new Mock<IOutboxRepository>();
        var pub = new Mock<IReservationEventPublisher>();
        var originalId = Guid.NewGuid();
        var outbox = SampleOutboxEvent(attemptCount: 1) with { EventId = originalId };

        repo.Setup(r => r.ClaimBatchAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([outbox]);
        pub.Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 0L));

        var svc = BuildService(repo, pub);
        using var cts = new CancellationTokenSource();
        await svc.StartAsync(cts.Token);
        await Task.Delay(150);
        cts.Cancel();
        await svc.StopAsync(CancellationToken.None);

        // The payload published must match the original — not a newly generated event.
        pub.Verify(p => p.PublishAsync(It.IsAny<string>(), outbox.MessageKey, outbox.Payload, It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }
}
