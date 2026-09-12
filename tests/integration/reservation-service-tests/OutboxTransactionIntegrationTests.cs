using System.Text.Json;
using Confluent.Kafka;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MySqlConnector;
using ReservationService.Data;
using ReservationService.Events;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceIntegrationTests;

/// <summary>
/// SR-114: MySQL + Kafka integration tests for the transactional outbox pattern.
/// Skipped when SR101_TEST_MYSQL env var is absent (CI without MySQL/Kafka).
/// Set SR101_TEST_MYSQL to a real connection string and SR101_TEST_KAFKA to broker address to run.
/// These tests use real InnoDB transactions — mocked transactions cannot prove atomicity.
/// </summary>
public sealed class OutboxTransactionIntegrationTests : IAsyncLifetime
{
    private static readonly string? ConnectionString = Environment.GetEnvironmentVariable("SR101_TEST_MYSQL");
    private static readonly string? KafkaBootstrap = Environment.GetEnvironmentVariable("SR101_TEST_KAFKA");
    private static bool ShouldSkip => string.IsNullOrWhiteSpace(ConnectionString);

    private DatabaseHelper _db = null!;
    private OutboxRepository _outboxRepo = null!;
    private BookingReferenceGenerator _refGen = null!;
    private ReservationMaintenancePolicy _policy = null!;
    private ReservationRepository _reservationRepo = null!;
    private MySqlConnection _connection = null!;

    public async Task InitializeAsync()
    {
        if (ShouldSkip) return;

        _db = new TestDatabaseHelper(ConnectionString!);
        _outboxRepo = new OutboxRepository(_db);
        _refGen = new BookingReferenceGenerator();
        var availOpts = Options.Create(new AvailabilityRulesOptions
        {
            TimeZoneId = "Asia/Colombo",
            OpeningTime = "10:00",
            ClosingTime = "22:00",
            MinimumDurationMinutes = 30,
            MaximumDurationMinutes = 240,
        });
        _policy = new ReservationMaintenancePolicy(TimeProvider.System, availOpts);
        _reservationRepo = new ReservationRepository(_db, _refGen, _policy, _outboxRepo);

        // Clean up outbox rows from previous test runs.
        _connection = new MySqlConnection(ConnectionString);
        await _connection.OpenAsync();
        await using var cleanup = new MySqlCommand("DELETE FROM ReservationOutbox WHERE AggregateType = 'Reservation' AND CreatedAtUtc > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR);", _connection);
        await cleanup.ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (_connection is not null) await _connection.DisposeAsync();
    }

    // ── Test 1: Successful creation inserts outbox row ────────────────────────────────────────

    [SkippableFact]
    public async Task CreateReservation_InsertsOutboxEvent_AtomicallyWithReservation()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var command = new ReservationCreationCommand(CustomerId: 1, TableId: tableId, Period: FuturePeriod(), IdempotencyKey: null);

        var beforeCount = await OutboxCountAsync(OutboxEventStatus.Pending);
        var result = await _reservationRepo.CreateAtomicallyAsync(command);

        Assert.Equal(ReservationCreateOutcome.Created, result.Outcome);
        var afterCount = await OutboxCountAsync(OutboxEventStatus.Pending);
        Assert.Equal(beforeCount + 1, afterCount);

        var events = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Pending, 10);
        var created = events.LastOrDefault(e => e.AggregateId == result.Reservation!.Id);
        Assert.NotNull(created);
        Assert.Equal(ReservationEventTypes.ReservationCreated, created!.EventType);
        Assert.Equal(result.Reservation!.Id.ToString(), created.MessageKey);
        Assert.Equal(1, created.SchemaVersion);
        Assert.NotEqual(Guid.Empty, created.EventId);
    }

    // ── Test 2: Conflict rollback creates no outbox row ───────────────────────────────────────

    [SkippableFact]
    public async Task OverlappingCreate_RollsBack_CreatesNoOutboxRow()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var period = FuturePeriod();

        // First booking succeeds.
        var first = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, period, null));
        Assert.Equal(ReservationCreateOutcome.Created, first.Outcome);

        var beforeCount = await OutboxCountAsync(OutboxEventStatus.Pending);

        // Second booking for the same table and period is blocked.
        var second = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(2, tableId, period, null));
        Assert.Equal(ReservationCreateOutcome.Unavailable, second.Outcome);

        var afterCount = await OutboxCountAsync(OutboxEventStatus.Pending);
        Assert.Equal(beforeCount, afterCount); // no new outbox row on rollback
    }

    // ── Test 3: Idempotent replay creates no duplicate outbox row ─────────────────────────────

    [SkippableFact]
    public async Task IdempotentCreate_Replay_CreatesNoAdditionalOutboxRow()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var key = $"idem-test-{Guid.NewGuid():N}";
        var command = new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 5), key);

        var first = await _reservationRepo.CreateAtomicallyAsync(command);
        Assert.Equal(ReservationCreateOutcome.Created, first.Outcome);

        var countAfterFirst = await OutboxCountForReservationAsync(first.Reservation!.Id);
        Assert.Equal(1, countAfterFirst);

        // Replay — same idempotency key, same customer.
        var replay = await _reservationRepo.CreateAtomicallyAsync(command);
        Assert.Equal(ReservationCreateOutcome.Replayed, replay.Outcome);

        var countAfterReplay = await OutboxCountForReservationAsync(first.Reservation!.Id);
        Assert.Equal(1, countAfterReplay); // still exactly one event
    }

    // ── Test 4: Admin status change creates outbox row ────────────────────────────────────────

    [SkippableFact]
    public async Task UpdateStatus_Confirmed_InsertsStatusChangedEvent()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var create = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 8), null));
        Assert.Equal(ReservationCreateOutcome.Created, create.Outcome);
        var reservationId = create.Reservation!.Id;

        var beforeCount = await OutboxCountForReservationAsync(reservationId);

        var updated = await _reservationRepo.UpdateStatusAsync(reservationId, null, "Pending", "Confirmed");
        Assert.True(updated);

        var afterCount = await OutboxCountForReservationAsync(reservationId);
        Assert.Equal(beforeCount + 1, afterCount);

        var events = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Pending, 50);
        var statusEvent = events.FirstOrDefault(e => e.AggregateId == reservationId && e.EventType == ReservationEventTypes.ReservationStatusChanged);
        Assert.NotNull(statusEvent);

        var envelope = JsonSerializer.Deserialize<JsonElement>(statusEvent!.Payload);
        Assert.Equal("ReservationStatusChanged", envelope.GetProperty("eventType").GetString());
        Assert.Equal(1, envelope.GetProperty("schemaVersion").GetInt32());
    }

    // ── Test 5: Admin cancel creates ReservationCancelled event (not StatusChanged) ──────────

    [SkippableFact]
    public async Task UpdateStatus_Cancelled_InsertsCancelledEvent_NotStatusChanged()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var create = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 10), null));
        var reservationId = create.Reservation!.Id;

        var updated = await _reservationRepo.UpdateStatusAsync(reservationId, null, "Pending", "Cancelled");
        Assert.True(updated);

        var events = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Pending, 50);
        var cancelEvent = events.FirstOrDefault(e => e.AggregateId == reservationId && e.EventType == ReservationEventTypes.ReservationCancelled);
        var statusEvent = events.FirstOrDefault(e => e.AggregateId == reservationId && e.EventType == ReservationEventTypes.ReservationStatusChanged);

        Assert.NotNull(cancelEvent);
        Assert.Null(statusEvent); // only one event type for cancellation
    }

    // ── Test 6: EventId is unique across events ────────────────────────────────────────────────

    [SkippableFact]
    public async Task TwoCreations_HaveDifferentEventIds()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var r1 = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 12), null));
        var r2 = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 14), null));

        Assert.Equal(ReservationCreateOutcome.Created, r1.Outcome);
        Assert.Equal(ReservationCreateOutcome.Created, r2.Outcome);

        var events = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Pending, 50);
        var e1 = events.First(e => e.AggregateId == r1.Reservation!.Id);
        var e2 = events.First(e => e.AggregateId == r2.Reservation!.Id);

        Assert.NotEqual(e1.EventId, e2.EventId);
    }

    // ── Test 7: Pending events returned in deterministic order ────────────────────────────────

    [SkippableFact]
    public async Task GetByStatus_ReturnsPendingInOccurredAtOrder()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 16), null));
        await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 18), null));

        var events = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Pending, 100);
        var ordered = events.OrderBy(e => e.OccurredAtUtc).ThenBy(e => e.Id).ToList();

        Assert.Equal(ordered.Select(e => e.Id), events.Select(e => e.Id));
    }

    // ── Test 8: Outbox claim marks rows Processing ─────────────────────────────────────────────

    [SkippableFact]
    public async Task ClaimBatch_MarksRowsProcessing()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var create = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 20), null));
        var reservationId = create.Reservation!.Id;

        var lockId = Guid.NewGuid();
        var batch = await _outboxRepo.ClaimBatchAsync(lockId, 10, TimeSpan.FromSeconds(30));

        var claimed = batch.FirstOrDefault(e => e.AggregateId == reservationId);
        Assert.NotNull(claimed);
        Assert.Equal(OutboxEventStatus.Processing, claimed!.Status);
        Assert.Equal(lockId, claimed.LockId);
    }

    // ── Test 9: MarkProcessed sets Processed status ────────────────────────────────────────────

    [SkippableFact]
    public async Task MarkProcessed_SetsProcessedStatus()
    {
        SkippableFactAttribute.Skip(ShouldSkip, "SR101_TEST_MYSQL not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var create = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 22), null));
        var reservationId = create.Reservation!.Id;

        var batch = await _outboxRepo.ClaimBatchAsync(Guid.NewGuid(), 10, TimeSpan.FromSeconds(30));
        var row = batch.First(e => e.AggregateId == reservationId);
        await _outboxRepo.MarkProcessedAsync(row.Id);

        var processed = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Processed, 50);
        Assert.Contains(processed, e => e.Id == row.Id);
    }

    // ── Test 10: Broker integration — real publish, mark processed ─────────────────────────────

    [SkippableFact]
    public async Task RealKafka_PublishAndMarkProcessed_End2End()
    {
        SkippableFactAttribute.Skip(ShouldSkip || string.IsNullOrWhiteSpace(KafkaBootstrap),
            "SR101_TEST_MYSQL or SR101_TEST_KAFKA not set");

        var tableId = await GetFirstActiveTableIdAsync();
        var create = await _reservationRepo.CreateAtomicallyAsync(new ReservationCreationCommand(1, tableId, FuturePeriod(offsetHours: 24), null));
        var reservationId = create.Reservation!.Id;

        var batch = await _outboxRepo.ClaimBatchAsync(Guid.NewGuid(), 10, TimeSpan.FromSeconds(60));
        var outboxRow = batch.First(e => e.AggregateId == reservationId);

        // Publish to real Kafka.
        var producerConfig = new ProducerConfig { BootstrapServers = KafkaBootstrap };
        using var producer = new ProducerBuilder<string, string>(producerConfig).Build();
        var result = await producer.ProduceAsync("restaurant.reservations.v1",
            new Message<string, string> { Key = outboxRow.MessageKey, Value = outboxRow.Payload });

        // Key must be the reservation ID.
        Assert.Equal(reservationId.ToString(), result.Key);
        Assert.Equal("restaurant.reservations.v1", result.Topic);

        // Mark processed only after broker acknowledgement.
        await _outboxRepo.MarkProcessedAsync(outboxRow.Id);

        var processed = await _outboxRepo.GetByStatusAsync(OutboxEventStatus.Processed, 50);
        Assert.Contains(processed, e => e.Id == outboxRow.Id && e.ProcessedAtUtc.HasValue);

        // Consume the event and verify JSON contract.
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = KafkaBootstrap,
            GroupId = $"test-sr114-{Guid.NewGuid():N}",
            AutoOffsetReset = AutoOffsetReset.Earliest,
        };
        using var consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
        consumer.Assign(new TopicPartitionOffset(result.TopicPartition, result.Offset));
        var consumed = consumer.Consume(TimeSpan.FromSeconds(10));

        Assert.NotNull(consumed);
        Assert.Equal(reservationId.ToString(), consumed.Message.Key);
        var envelope = JsonSerializer.Deserialize<JsonElement>(consumed.Message.Value);
        Assert.Equal("ReservationCreated", envelope.GetProperty("eventType").GetString());
        Assert.Equal(1, envelope.GetProperty("schemaVersion").GetInt32());
        Assert.Equal(reservationId, envelope.GetProperty("reservationId").GetInt32());
        // Verify no sensitive fields are present.
        Assert.False(envelope.TryGetProperty("password", out _));
        Assert.False(envelope.TryGetProperty("connectionString", out _));
        consumer.Close();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────────────────

    private async Task<int> GetFirstActiveTableIdAsync()
    {
        await using var cmd = new MySqlCommand("SELECT Id FROM RestaurantTables WHERE IsActive = 1 LIMIT 1;", _connection);
        var result = await cmd.ExecuteScalarAsync();
        return result is null ? throw new InvalidOperationException("No active tables found") : Convert.ToInt32(result);
    }

    private async Task<int> OutboxCountAsync(string status)
    {
        await using var cmd = new MySqlCommand("SELECT COUNT(*) FROM ReservationOutbox WHERE Status = @Status;", _connection);
        cmd.Parameters.AddWithValue("@Status", status);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private async Task<int> OutboxCountForReservationAsync(int reservationId)
    {
        await using var cmd = new MySqlCommand("SELECT COUNT(*) FROM ReservationOutbox WHERE AggregateId = @Id;", _connection);
        cmd.Parameters.AddWithValue("@Id", reservationId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static AvailabilitySearchCriteria FuturePeriod(int offsetHours = 2)
    {
        var start = DateTime.UtcNow.AddDays(7).AddHours(offsetHours).Date.AddHours(14);
        return new AvailabilitySearchCriteria(start, start.AddHours(1), 2);
    }

    /// <summary>Thin DatabaseHelper override that uses the test connection string.</summary>
    private sealed class TestDatabaseHelper(string connectionString) : DatabaseHelper(BuildConfig(connectionString))
    {
        private static IConfiguration BuildConfig(string cs) =>
            new Microsoft.Extensions.Configuration.ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:DefaultConnection"] = cs })
                .Build();
    }
}

/// <summary>xUnit skip attribute — equivalent to [Fact(Skip=...)] but conditionally skipped at runtime.</summary>
public sealed class SkippableFactAttribute : FactAttribute
{
    public static new void Skip(bool condition, string reason)
    {
        if (condition) throw new SkipException(reason);
    }
}

public sealed class SkipException(string reason) : Exception(reason);
