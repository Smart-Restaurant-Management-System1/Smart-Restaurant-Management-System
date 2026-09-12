using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;
using ReservationService.Controllers;
using ReservationService.Data;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceIntegrationTests;

public sealed class MySqlFactAttribute : FactAttribute
{
    public MySqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SR59_TEST_MYSQL")))
            Skip = "Set SR59_TEST_MYSQL to a local MySQL test account with CREATE/DROP DATABASE permission.";
    }
}

public sealed class MaintenanceDatabase : IAsyncLifetime
{
    private readonly string name = "sr59_test_" + Guid.NewGuid().ToString("N");
    private string? adminConnection;
    public string ConnectionString { get; private set; } = "";
    public DatabaseHelper Helper => new(new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?> { ["ConnectionStrings:DefaultConnection"] = ConnectionString }).Build());
    public sealed class Clock : TimeProvider { public override DateTimeOffset GetUtcNow() => new(2030, 1, 1, 0, 0, 0, TimeSpan.Zero); }
    public ReservationRepository Repository(DatabaseHelper? helper = null) => new(helper ?? Helper,
        new BookingReferenceGenerator(), new ReservationMaintenancePolicy(new Clock(), Options.Create(new AvailabilityRulesOptions())));
    public async Task InitializeAsync()
    {
        var setting = Environment.GetEnvironmentVariable("SR59_TEST_MYSQL");
        if (string.IsNullOrWhiteSpace(setting)) return;
        var builder = new MySqlConnectionStringBuilder(setting) { Database = "" };
        adminConnection = builder.ConnectionString;
        await using var admin = new MySqlConnection(adminConnection);
        await admin.OpenAsync();
        await using (var create = new MySqlCommand("CREATE DATABASE " + name, admin)) await create.ExecuteNonQueryAsync();
        builder.Database = name;
        ConnectionString = builder.ConnectionString;
        await ExecuteAsync("""
            CREATE TABLE RestaurantTables (Id INT AUTO_INCREMENT PRIMARY KEY, TableNumber VARCHAR(32) NOT NULL,
              Capacity INT NOT NULL, IsActive BOOLEAN NOT NULL DEFAULT TRUE) ENGINE=InnoDB;
            CREATE TABLE Reservations (Id INT AUTO_INCREMENT PRIMARY KEY, CustomerId INT NOT NULL,
              TableId INT NOT NULL, BookingReference VARCHAR(16) NOT NULL UNIQUE,
              StartDateTime DATETIME NOT NULL, EndDateTime DATETIME NOT NULL, GuestCount INT NOT NULL,
              Status VARCHAR(20) NOT NULL, IdempotencyKey VARCHAR(64) NULL,
              CreatedAt DATETIME NOT NULL, UpdatedAt DATETIME NOT NULL,
              FOREIGN KEY(TableId) REFERENCES RestaurantTables(Id),
              CHECK(EndDateTime > StartDateTime), CHECK(GuestCount > 0),
              CHECK(Status IN ('Pending','Confirmed','Cancelled','Completed')),
              UNIQUE KEY customer_request(CustomerId,IdempotencyKey),
              INDEX idx_reservations_table_status_period(TableId,Status,StartDateTime,EndDateTime)) ENGINE=InnoDB;
            """);
    }
    public async Task DisposeAsync()
    {
        if (adminConnection is null) return;
        // Only this fixture's generated schema is removed. Never uses the configured database name.
        if (!System.Text.RegularExpressions.Regex.IsMatch(name, "^sr59_test_[a-f0-9]{32}$")) throw new InvalidOperationException("Unsafe test schema.");
        await using var connection = new MySqlConnection(adminConnection);
        await connection.OpenAsync();
        await using var drop = new MySqlCommand("DROP DATABASE " + name, connection);
        await drop.ExecuteNonQueryAsync();
    }
    public async Task ExecuteAsync(string sql)
    {
        await using var connection = new MySqlConnection(ConnectionString); await connection.OpenAsync();
        await using var command = new MySqlCommand(sql, connection); await command.ExecuteNonQueryAsync();
    }
    public async Task<int> TableAsync(int capacity = 4, bool active = true)
    {
        await using var connection = new MySqlConnection(ConnectionString); await connection.OpenAsync();
        await using var command = new MySqlCommand("INSERT INTO RestaurantTables(TableNumber,Capacity,IsActive) VALUES(@Number,@Capacity,@Active); SELECT LAST_INSERT_ID();", connection);
        command.Parameters.AddWithValue("@Number", Guid.NewGuid().ToString("N")[..8]);
        command.Parameters.AddWithValue("@Capacity", capacity); command.Parameters.AddWithValue("@Active", active);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
    public async Task<Reservation> BookingAsync(int table, int owner = 7, int hour = 18) =>
        (await Repository().CreateAtomicallyAsync(new(owner, table, Period(hour), Guid.NewGuid().ToString("N")))).Reservation!;
    public static AvailabilitySearchCriteria Period(int hour = 18, int guests = 2) => new(new(2031, 1, 1, hour, 0, 0), new(2031, 1, 1, hour + 1, 0, 0), guests);
}

public sealed class ReservationMaintenanceIntegrationTests(MaintenanceDatabase db) : IClassFixture<MaintenanceDatabase>
{
    [MySqlFact]
    public async Task OwnedDetailFiltersCustomerAndMapsValues()
    {
        var booking = await db.BookingAsync(await db.TableAsync());
        var repo = db.Repository();
        var owned = await repo.GetByIdForCustomerAsync(booking.Id, 7);
        Assert.Equal(booking.BookingReference, owned!.BookingReference);
        Assert.Equal(booking.TableNumber, owned.TableNumber);
        Assert.Null(await repo.GetByIdForCustomerAsync(booking.Id, 8));
        Assert.Null(await repo.GetByIdForCustomerAsync(int.MaxValue, 7));
    }

    [MySqlFact]
    public async Task UpdatePreservesIdentityAndExcludesItself()
    {
        var booking = await db.BookingAsync(await db.TableAsync());
        var result = await db.Repository().RescheduleAtomicallyAsync(new(booking.Id, 7, false, booking.TableId, MaintenanceDatabase.Period(18, 3)));
        Assert.Equal(ReservationRescheduleOutcome.Updated, result.Outcome);
        var saved = (await db.Repository().GetByIdAsync(booking.Id))!;
        Assert.Equal(3, saved.GuestCount); Assert.Equal(booking.BookingReference, saved.BookingReference);
        Assert.Equal(booking.CustomerId, saved.CustomerId); Assert.Equal(booking.Id, saved.Id);
        Assert.Equal(booking.Status, saved.Status);
    }

    [MySqlFact]
    public async Task CapacityInactiveMissingAndWrongOwnerLeaveBookingUnchanged()
    {
        var booking = await db.BookingAsync(await db.TableAsync());
        var repo = db.Repository();
        Assert.Equal(ReservationRescheduleOutcome.Unavailable, (await repo.RescheduleAtomicallyAsync(new(booking.Id, 7, false, await db.TableAsync(1), MaintenanceDatabase.Period()))).Outcome);
        Assert.Equal(ReservationRescheduleOutcome.Unavailable, (await repo.RescheduleAtomicallyAsync(new(booking.Id, 7, false, await db.TableAsync(active: false), MaintenanceDatabase.Period()))).Outcome);
        Assert.Equal(ReservationRescheduleOutcome.TableNotFound, (await repo.RescheduleAtomicallyAsync(new(booking.Id, 7, false, int.MaxValue, MaintenanceDatabase.Period()))).Outcome);
        Assert.Equal(ReservationRescheduleOutcome.NotFound, (await repo.RescheduleAtomicallyAsync(new(booking.Id, 8, false, int.MaxValue, MaintenanceDatabase.Period()))).Outcome);
        Assert.Equal(booking.TableId, (await repo.GetByIdAsync(booking.Id))!.TableId);
    }

    [MySqlFact]
    public async Task ConflictRollsBackAndStrictAdjacentPeriodSucceeds()
    {
        var table = await db.TableAsync();
        var first = await db.BookingAsync(table);
        await db.BookingAsync(table, 8, 20);
        var repo = db.Repository();
        Assert.Equal(ReservationRescheduleOutcome.Unavailable, (await repo.RescheduleAtomicallyAsync(new(first.Id, 7, false, table, MaintenanceDatabase.Period(20)))).Outcome);
        Assert.Equal(first.StartDateTime, (await repo.GetByIdAsync(first.Id))!.StartDateTime);
        Assert.Equal(ReservationRescheduleOutcome.Updated, (await repo.RescheduleAtomicallyAsync(new(first.Id, 7, false, table, MaintenanceDatabase.Period(19)))).Outcome);
    }

    [MySqlFact]
    public async Task TerminalAndPastUpdatesAndCancellationsAreRejected()
    {
        foreach (var status in new[] { "Cancelled", "Completed", "Pending", "Confirmed" })
        {
            var booking = await db.BookingAsync(await db.TableAsync());
            // Controlled test literals/identifiers only.
            await db.ExecuteAsync($"UPDATE Reservations SET Status='{status}', StartDateTime='2029-01-01 18:00:00', EndDateTime='2029-01-01 19:00:00' WHERE Id={booking.Id};");
            Assert.Equal(ReservationRescheduleOutcome.InvalidState, (await db.Repository().RescheduleAtomicallyAsync(new(booking.Id, 7, false, booking.TableId, MaintenanceDatabase.Period()))).Outcome);
            Assert.Equal(status == "Cancelled" ? ReservationCancellationOutcome.Cancelled : ReservationCancellationOutcome.InvalidState,
                (await db.Repository().CancelForCustomerAtomicallyAsync(booking.Id, 7)).Outcome);
        }
    }

    [MySqlFact]
    public async Task CancellationIsIdempotentOwnedAndNeverDeletes()
    {
        var booking = await db.BookingAsync(await db.TableAsync());
        var repo = db.Repository();
        Assert.Equal(ReservationCancellationOutcome.NotFound, (await repo.CancelForCustomerAtomicallyAsync(booking.Id, 8)).Outcome);
        var results = await Task.WhenAll(repo.CancelForCustomerAtomicallyAsync(booking.Id, 7), repo.CancelForCustomerAtomicallyAsync(booking.Id, 7));
        Assert.All(results, result => Assert.Equal(ReservationCancellationOutcome.Cancelled, result.Outcome));
        Assert.Equal(results[0].Reservation!.UpdatedAt, results[1].Reservation!.UpdatedAt);
        var saved = (await repo.GetByIdAsync(booking.Id))!;
        Assert.Equal("Cancelled", saved.Status); Assert.Equal(booking.BookingReference, saved.BookingReference);
        Assert.Equal(booking.CustomerId, saved.CustomerId); Assert.Equal(booking.Id, saved.Id);
    }

    [MySqlFact]
    public async Task CompetingReschedulesProduceOnlyOneWinner()
    {
        var a = await db.BookingAsync(await db.TableAsync());
        var b = await db.BookingAsync(await db.TableAsync(), 8);
        var target = await db.TableAsync();
        var results = await Task.WhenAll(
            db.Repository().RescheduleAtomicallyAsync(new(a.Id, 7, false, target, MaintenanceDatabase.Period())),
            db.Repository().RescheduleAtomicallyAsync(new(b.Id, 8, false, target, MaintenanceDatabase.Period())));
        Assert.Single(results.Where(x => x.Outcome == ReservationRescheduleOutcome.Updated));
        Assert.Single(results.Where(x => x.Outcome == ReservationRescheduleOutcome.Unavailable));
    }

    private sealed class GapHelper(DatabaseHelper inner, Func<Task> inGap) : DatabaseHelper(new ConfigurationBuilder().Build())
    {
        private int calls;
        public override async Task<MySqlConnection> CreateConnectionAsync(CancellationToken token = default)
        {
            if (Interlocked.Increment(ref calls) == 2) await inGap();
            return await inner.CreateConnectionAsync(token);
        }
    }
    [MySqlFact]
    public async Task CreateCommittedAfterPreflightBeforeTableLockIsObserved()
    {
        var a = await db.BookingAsync(await db.TableAsync());
        var target = await db.TableAsync();
        var helper = new GapHelper(db.Helper, async () => { await db.BookingAsync(target, 8); });
        var result = await db.Repository(helper).RescheduleAtomicallyAsync(new(a.Id, 7, false, target, MaintenanceDatabase.Period()));
        Assert.Equal(ReservationRescheduleOutcome.Unavailable, result.Outcome);
        Assert.Equal(a.TableId, (await db.Repository().GetByIdAsync(a.Id))!.TableId);
    }

    [MySqlFact]
    public async Task CrossTableMovesDoNotTakeInvertedSourceTableLocks()
    {
        var a = await db.BookingAsync(await db.TableAsync());
        var b = await db.BookingAsync(await db.TableAsync(), 8, 20);
        var results = await Task.WhenAll(
            db.Repository().RescheduleAtomicallyAsync(new(a.Id, 7, false, b.TableId, MaintenanceDatabase.Period(18))),
            db.Repository().RescheduleAtomicallyAsync(new(b.Id, 8, false, a.TableId, MaintenanceDatabase.Period(20)))).WaitAsync(TimeSpan.FromSeconds(15));
        Assert.All(results, x => Assert.Equal(ReservationRescheduleOutcome.Updated, x.Outcome));
    }

    private const string TestKey = "SR59-in-process-tests-only-signing-key-not-used-by-any-application";
    private IHost Api() => new HostBuilder().ConfigureWebHost(web => web.UseTestServer().ConfigureServices(services =>
    {
        services.AddLogging();
        services.AddControllers().AddApplicationPart(typeof(ReservationsController).Assembly);
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = "sr59-tests", ValidateAudience = true, ValidAudience = "sr59-tests",
                ValidateLifetime = true, ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey))
            });
        services.AddAuthorization();
        services.AddSingleton<TimeProvider>(new MaintenanceDatabase.Clock());
        services.Configure<AvailabilityRulesOptions>(_ => { });
        services.AddScoped<ReservationMaintenancePolicy>();
        services.AddSingleton<IReservationRepository>(db.Repository());
        services.AddSingleton<IAvailabilitySearchValidator, AvailabilitySearchValidator>();
        services.AddSingleton<IAvailabilitySearchService, AvailabilitySearchService>();
        services.AddSingleton<IAvailabilityRepository, AvailabilityRepository>();
        services.AddSingleton(db.Helper);
        services.AddSingleton<IReservationCreationService, ReservationCreationService>();
        services.AddSingleton<IReservationRescheduleService, ReservationRescheduleService>();
        services.AddSingleton<IReservationLifecycleService, ReservationLifecycleService>();
        services.AddSingleton<IAdminReservationService, AdminReservationService>();
    }).Configure(app =>
    {
        app.UseRouting(); app.UseAuthentication(); app.UseAuthorization();
        app.UseEndpoints(endpoints => endpoints.MapControllers());
    })).Start();
    private static string Token(int owner, string role) => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
        issuer: "sr59-tests", audience: "sr59-tests",
        claims: [new Claim(ClaimTypes.NameIdentifier, owner.ToString()), new Claim(ClaimTypes.Role, role)],
        expires: DateTime.UtcNow.AddMinutes(10), signingCredentials: new(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey)), SecurityAlgorithms.HmacSha256)));

    [MySqlFact]
    public async Task HttpJwtOwnershipAliasesValidationAndAdminCompatibility()
    {
        var booking = await db.BookingAsync(await db.TableAsync());
        using var server = Api(); using var client = server.GetTestClient();
        var detail = $"/api/reservations/{booking.Id}/detail";
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(detail)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(7, "KitchenStaff"));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(detail)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(8, "Customer"));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(detail)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PatchAsync($"/api/reservations/{booking.Id}/cancel", null)).StatusCode);
        var update = new { tableId = booking.TableId, date = "2031-01-01", startTime = "18:00", durationMinutes = 60, guestCount = 3, customerId = 8, status = "Completed", bookingReference = "FORGED" };
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/reservations/{booking.Id}", update)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(7, "Customer"));
        var dto = await client.GetFromJsonAsync<CustomerReservationDetailDto>(detail);
        Assert.True(dto!.CanEdit);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/reservations/{booking.Id}", update)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/reservations/{booking.Id}/schedule", update)).StatusCode);
        var saved = (await db.Repository().GetByIdAsync(booking.Id))!;
        Assert.Equal(7, saved.CustomerId); Assert.Equal(booking.BookingReference, saved.BookingReference); Assert.Equal("Pending", saved.Status);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/reservations/{booking.Id}", new { tableId = booking.TableId, date = "invalid" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsync($"/api/reservations/{booking.Id}/cancel", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/reservations/{booking.Id}/cancel", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/reservations/{booking.Id}", update)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/reservations/{booking.Id}")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(99, "Admin"));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/reservations/{booking.Id}")).StatusCode);
    }
}
