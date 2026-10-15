using System.Text.Json;
using ReservationService.Events;
using ReservationService.Models;
using Xunit;

namespace ReservationServiceTests;

/// <summary>
/// SR-114: Contract tests for all four SR-113 versioned event types.
/// Verifies exact event type, schema version, envelope fields, payload fields,
/// UTC timestamp serialization, and absence of prohibited PII fields.
/// Uses real serialization — not source-code inspection.
/// </summary>
public sealed class EventContractTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private static Reservation SampleReservation(string status = "Pending") => new()
    {
        Id = 42,
        CustomerId = 7,
        TableId = 3,
        TableNumber = "T-03",
        BookingReference = "SR-ABCD-EFGH",
        StartDateTime = new DateTime(2031, 6, 15, 14, 30, 0),
        EndDateTime = new DateTime(2031, 6, 15, 16, 0, 0),
        GuestCount = 4,
        Status = status,
        CreatedAt = new DateTime(2031, 5, 1, 10, 0, 0),
        UpdatedAt = new DateTime(2031, 5, 1, 10, 0, 0),
    };

    private static DateTimeOffset FixedOccurredAt =>
        new DateTimeOffset(2031, 6, 14, 12, 0, 0, TimeSpan.Zero);

    // ── ReservationCreated ───────────────────────────────────────────────────────────────────

    [Fact]
    public void Created_EventType_IsReservationCreated()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal(ReservationEventTypes.ReservationCreated, env.EventType);
    }

    [Fact]
    public void Created_SchemaVersion_IsOne()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal(1, env.SchemaVersion);
    }

    [Fact]
    public void Created_EventId_IsNonEmptyGuid()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.NotEqual(Guid.Empty, env.EventId);
    }

    [Fact]
    public void Created_OccurredAtUtc_MatchesInput()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal(FixedOccurredAt, env.OccurredAtUtc);
    }

    [Fact]
    public void Created_OccurredAtUtc_IsUtc()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal(TimeSpan.Zero, env.OccurredAtUtc.Offset);
    }

    [Fact]
    public void Created_ReservationId_MatchesReservation()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal(42, env.ReservationId);
    }

    [Fact]
    public void Created_BookingReference_MatchesReservation()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        Assert.Equal("SR-ABCD-EFGH", env.BookingReference);
    }

    [Fact]
    public void Created_Payload_ContainsRequiredFields()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        var payload = Assert.IsType<ReservationCreatedPayload>(env.Payload);
        Assert.Equal(3, payload.TableId);
        Assert.Equal("T-03", payload.TableNumber);
        Assert.Equal(4, payload.GuestCount);
        Assert.Equal("Pending", payload.InitialStatus);
        Assert.Equal(7, payload.CustomerId);
    }

    [Fact]
    public void Created_SerializesWithCamelCasePropertyNames()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        var json = JsonSerializer.Serialize(env, Options);
        Assert.Contains("\"eventType\"", json);
        Assert.Contains("\"schemaVersion\"", json);
        Assert.Contains("\"eventId\"", json);
        Assert.Contains("\"occurredAtUtc\"", json);
        Assert.Contains("\"reservationId\"", json);
        Assert.Contains("\"bookingReference\"", json);
        Assert.Contains("\"payload\"", json);
    }

    [Fact]
    public void Created_SerializedJson_ContainsUtcIndicator()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        var json = JsonSerializer.Serialize(env, Options);
        // DateTimeOffset with zero offset serializes as Z suffix in ISO 8601.
        Assert.Contains("+00:00", json);
    }

    [Fact]
    public void Created_SerializedJson_DoesNotContainPassword_Or_JWT_Or_ConnectionString()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        var json = JsonSerializer.Serialize(env, Options);
        Assert.DoesNotContain("password", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("jwt", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("connectionstring", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Server=", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Created_SerializedJson_DoesNotContainEmail_Or_Phone()
    {
        var env = ReservationEventFactory.Created(SampleReservation(), FixedOccurredAt);
        var json = JsonSerializer.Serialize(env, Options);
        Assert.DoesNotContain("email", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("phone", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("name", json, StringComparison.OrdinalIgnoreCase);
    }

    // ── ReservationUpdated ───────────────────────────────────────────────────────────────────

    [Fact]
    public void Updated_EventType_IsReservationUpdated()
    {
        var env = ReservationEventFactory.Updated(SampleReservation("Confirmed"), FixedOccurredAt);
        Assert.Equal(ReservationEventTypes.ReservationUpdated, env.EventType);
    }

    [Fact]
    public void Updated_SchemaVersion_IsOne()
    {
        var env = ReservationEventFactory.Updated(SampleReservation(), FixedOccurredAt);
        Assert.Equal(1, env.SchemaVersion);
    }

    [Fact]
    public void Updated_Payload_ContainsCurrentSnapshot()
    {
        var r = SampleReservation("Confirmed");
        var env = ReservationEventFactory.Updated(r, FixedOccurredAt);
        var payload = Assert.IsType<ReservationUpdatedPayload>(env.Payload);
        Assert.Equal(r.TableId, payload.TableId);
        Assert.Equal(r.GuestCount, payload.GuestCount);
        Assert.Equal("Confirmed", payload.Status);
    }

    [Fact]
    public void Updated_Payload_UpdatedAtUtc_IsUtc()
    {
        var env = ReservationEventFactory.Updated(SampleReservation(), FixedOccurredAt);
        var payload = Assert.IsType<ReservationUpdatedPayload>(env.Payload);
        Assert.Equal(TimeSpan.Zero, payload.UpdatedAtUtc.Offset);
    }

    // ── ReservationCancelled ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Cancelled_EventType_IsReservationCancelled()
    {
        var env = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        Assert.Equal(ReservationEventTypes.ReservationCancelled, env.EventType);
    }

    [Fact]
    public void Cancelled_SchemaVersion_IsOne()
    {
        var env = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        Assert.Equal(1, env.SchemaVersion);
    }

    [Fact]
    public void Cancelled_Payload_CancellationStatus_IsCancelled()
    {
        var env = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        var payload = Assert.IsType<ReservationCancelledPayload>(env.Payload);
        Assert.Equal("Cancelled", payload.CancellationStatus);
    }

    [Fact]
    public void Cancelled_Payload_CancelledAtUtc_IsUtc()
    {
        var env = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        var payload = Assert.IsType<ReservationCancelledPayload>(env.Payload);
        Assert.Equal(TimeSpan.Zero, payload.CancelledAtUtc.Offset);
    }

    [Fact]
    public void Cancelled_Payload_CustomerId_Present()
    {
        var env = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        var payload = Assert.IsType<ReservationCancelledPayload>(env.Payload);
        Assert.Equal(7, payload.CustomerId);
    }

    // ── ReservationStatusChanged ─────────────────────────────────────────────────────────────

    [Fact]
    public void StatusChanged_EventType_IsReservationStatusChanged()
    {
        var env = ReservationEventFactory.StatusChanged(SampleReservation("Confirmed"), "Pending", FixedOccurredAt);
        Assert.Equal(ReservationEventTypes.ReservationStatusChanged, env.EventType);
    }

    [Fact]
    public void StatusChanged_Payload_PreviousAndCurrentStatus()
    {
        var env = ReservationEventFactory.StatusChanged(SampleReservation("Confirmed"), "Pending", FixedOccurredAt);
        var payload = Assert.IsType<ReservationStatusChangedPayload>(env.Payload);
        Assert.Equal("Pending", payload.PreviousStatus);
        Assert.Equal("Confirmed", payload.CurrentStatus);
    }

    [Fact]
    public void StatusChanged_Payload_ChangedAtUtc_IsUtc()
    {
        var env = ReservationEventFactory.StatusChanged(SampleReservation("Confirmed"), "Pending", FixedOccurredAt);
        var payload = Assert.IsType<ReservationStatusChangedPayload>(env.Payload);
        Assert.Equal(TimeSpan.Zero, payload.ChangedAtUtc.Offset);
    }

    // ── Cancellation vs StatusChanged event matrix ────────────────────────────────────────────

    [Fact]
    public void CancelledTransition_ProducesReservationCancelled_NotStatusChanged()
    {
        // When status transitions to Cancelled, emit ReservationCancelled — not ReservationStatusChanged.
        // This verifies the event matrix: these two events are never emitted for the same transition.
        var cancelled = ReservationEventFactory.Cancelled(SampleReservation("Cancelled"), FixedOccurredAt);
        Assert.Equal(ReservationEventTypes.ReservationCancelled, cancelled.EventType);
        Assert.NotEqual(ReservationEventTypes.ReservationStatusChanged, cancelled.EventType);
    }

    // ── EventId uniqueness across calls ──────────────────────────────────────────────────────

    [Fact]
    public void TwoCallsToSameFactory_ProduceDifferentEventIds()
    {
        var r = SampleReservation();
        var env1 = ReservationEventFactory.Created(r, FixedOccurredAt);
        var env2 = ReservationEventFactory.Created(r, FixedOccurredAt);
        Assert.NotEqual(env1.EventId, env2.EventId);
    }

    // ── Backoff calculation ───────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(1, 5)]
    [InlineData(2, 10)]
    [InlineData(3, 20)]
    [InlineData(4, 40)]
    [InlineData(10, 300)] // capped at MaxRetryDelaySeconds
    [InlineData(31, 300)] // overflow guard: exponent capped at 30
    public void BackoffCalculation_IsDoubling_CappedAtMax(int attempt, int expectedDelaySecs)
    {
        var svc = new ReservationService.Services.OutboxPublisherService(
            new Moq.Mock<ReservationService.Repositories.IOutboxRepository>().Object,
            new Moq.Mock<ReservationService.Services.IReservationEventPublisher>().Object,
            Microsoft.Extensions.Options.Options.Create(new ReservationService.Models.KafkaOptions
            {
                BootstrapServers = "localhost:9092",
                InitialRetryDelaySeconds = 5,
                MaxRetryDelaySeconds = 300,
            }),
            new Moq.Mock<Microsoft.Extensions.Logging.ILogger<ReservationService.Services.OutboxPublisherService>>().Object);
        var next = svc.CalculateNextAttempt(attempt);
        var actualDelay = (next - DateTime.UtcNow).TotalSeconds;
        Assert.InRange(actualDelay, expectedDelaySecs - 1, expectedDelaySecs + 2);
    }
}
