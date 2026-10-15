using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationCreationTests
{
    [Fact]
    public void BookingReference_HasCustomerReadableNonSequentialFormat()
    {
        var reference = new BookingReferenceGenerator().Generate();
        Assert.Matches("^SR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$", reference);
    }

    [Fact]
    public async Task CreateReservation_UsesCustomerIdFromJwtAndReturns201()
    {
        var creator = new Mock<IReservationCreationService>();
        creator.Setup(x => x.CreateAsync(It.IsAny<ReservationCreationCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReservationCreateResult(ReservationCreateOutcome.Created, new Reservation { Id = 44, CustomerId = 101, TableId = 2, TableNumber = "T-02", BookingReference = "SR-ABCD-EFGH", StartDateTime = new(2026, 9, 12, 19, 0, 0), EndDateTime = new(2026, 9, 12, 20, 30, 0), GuestCount = 4, Status = "Pending", CreatedAt = DateTime.UtcNow }));
        var controller = CreateController(creator.Object, "101");

        var result = await controller.CreateReservation(new CreateReservationRequestDto { TableId = 2, Date = new(2026, 9, 12), StartTime = new(19, 0), DurationMinutes = 90, GuestCount = 4 }, "attempt-1");

        var created = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, created.StatusCode);
        var response = Assert.IsType<ReservationConfirmationResponseDto>(created.Value);
        Assert.Equal("SR-ABCD-EFGH", response.BookingReference);
        creator.Verify(x => x.CreateAsync(It.Is<ReservationCreationCommand>(c => c.CustomerId == 101 && c.TableId == 2), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateReservation_InvalidInput_DoesNotCallRepositoryService()
    {
        var creator = new Mock<IReservationCreationService>();
        var result = await CreateController(creator.Object, "101").CreateReservation(new CreateReservationRequestDto { TableId = 0 }, null);
        Assert.IsType<BadRequestObjectResult>(result);
        creator.Verify(x => x.CreateAsync(It.IsAny<ReservationCreationCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateReservation_Conflict_Returns409WithoutConflictDetails()
    {
        var creator = new Mock<IReservationCreationService>();
        creator.Setup(x => x.CreateAsync(It.IsAny<ReservationCreationCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(new ReservationCreateResult(ReservationCreateOutcome.Unavailable));
        var result = await CreateController(creator.Object, "101").CreateReservation(ValidRequest(), "attempt-1");
        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(409, conflict.StatusCode);
        Assert.DoesNotContain("reservation", conflict.Value!.ToString()!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Repository_UsesOneTransactionAndLocksTableBeforeOverlapCheck()
    {
        var source = File.ReadAllText(Path.Combine(ProjectRoot(), "backend", "reservation-service", "Repositories", "ReservationRepository.cs"));
        Assert.Contains("BeginTransactionAsync", source); Assert.Contains("FOR UPDATE", source);
        Assert.Contains("HasBlockingOverlapAsync", source); Assert.Contains("InsertAsync(connection, transaction", source);
        Assert.Contains("CommitAsync", source); Assert.Contains("RollbackAsync", source);
    }

    private static ReservationsController CreateController(IReservationCreationService creator, string customerId)
    {
        var controller = new ReservationsController(CreateValidator(), Mock.Of<IAvailabilitySearchService>(), creator, Mock.Of<ILogger<ReservationsController>>());
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, customerId), new Claim(ClaimTypes.Role, AppRoles.Customer)], "test")) } };
        return controller;
    }

    private static CreateReservationRequestDto ValidRequest() => new() { TableId = 2, Date = new(2026, 9, 12), StartTime = new(19, 0), DurationMinutes = 90, GuestCount = 4 };
    private static AvailabilitySearchValidator CreateValidator() => new(new FixedTimeProvider(new(2026, 9, 11, 12, 0, 0, TimeSpan.Zero)), Options.Create(new AvailabilityRulesOptions()));
    private static string ProjectRoot() => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".."));
    private sealed class FixedTimeProvider(DateTimeOffset current) : TimeProvider { public override DateTimeOffset GetUtcNow() => current; }
}
