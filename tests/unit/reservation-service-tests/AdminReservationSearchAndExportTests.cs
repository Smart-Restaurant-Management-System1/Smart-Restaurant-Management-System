using System.Security.Claims;
using System.Text;
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

public sealed class AdminReservationSearchAndExportTests
{
    private static ReservationsController CreateController(
        Mock<IAdminReservationService> adminServiceMock,
        string role = AppRoles.Admin)
    {
        var mockValidator = new Mock<IAvailabilitySearchValidator>();
        var mockService = new Mock<IAvailabilitySearchService>();
        var mockCreationService = new Mock<IReservationCreationService>();
        var mockLogger = new Mock<ILogger<ReservationsController>>();

        var controller = new ReservationsController(
            mockValidator.Object,
            mockService.Object,
            mockCreationService.Object,
            mockLogger.Object,
            adminService: adminServiceMock.Object);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(ClaimTypes.Email, "admin@cinnamonbistro.com"),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }

    [Fact]
    public async Task GetAdminReservations_ValidQueryWithCustomer_ReturnsOkWithCustomerDetails()
    {
        var mockAdminService = new Mock<IAdminReservationService>();
        var sampleReservations = new List<Reservation>
        {
            new()
            {
                Id = 101,
                CustomerId = 42,
                CustomerName = "John Perera",
                CustomerEmail = "john@example.com",
                CustomerPhone = "0771234567",
                TableId = 5,
                TableNumber = "T-05",
                BookingReference = "CB-101",
                StartDateTime = DateTime.UtcNow.AddDays(1),
                EndDateTime = DateTime.UtcNow.AddDays(1).AddHours(2),
                GuestCount = 4,
                Status = "Confirmed",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        var historyPage = new ReservationHistoryPage(sampleReservations, 1, 20, 1);

        mockAdminService.Setup(s => s.SearchAsync(It.Is<AdminReservationQuery>(q => q.Customer == "John"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(historyPage);

        var controller = CreateController(mockAdminService);
        var result = await controller.GetAdminReservations(new AdminReservationQueryDto
        {
            Customer = "John",
            Page = 1,
            PageSize = 20
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminReservationResponseDto>(okResult.Value);
        Assert.Single(response.Items);
        Assert.Equal("John Perera", response.Items[0].CustomerName);
        Assert.Equal("john@example.com", response.Items[0].CustomerEmail);
        Assert.Equal("0771234567", response.Items[0].CustomerPhone);
    }

    [Fact]
    public async Task GetAdminReservations_InvalidDateRange_FromAfterTo_Returns400()
    {
        var mockAdminService = new Mock<IAdminReservationService>();
        var controller = CreateController(mockAdminService);

        var result = await controller.GetAdminReservations(new AdminReservationQueryDto
        {
            VisitFrom = new DateOnly(2026, 10, 20),
            VisitTo = new DateOnly(2026, 10, 10)
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.True(problem.Errors.ContainsKey("visitTo"));
    }

    [Fact]
    public async Task GetAdminReservations_DateRangeExceeds90Days_Returns400()
    {
        var mockAdminService = new Mock<IAdminReservationService>();
        var controller = CreateController(mockAdminService);

        var result = await controller.GetAdminReservations(new AdminReservationQueryDto
        {
            VisitFrom = new DateOnly(2026, 1, 1),
            VisitTo = new DateOnly(2026, 6, 1) // ~150 days
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.True(problem.Errors.ContainsKey("visitTo"));
    }

    [Fact]
    public async Task ExportAdminReservations_ValidFilters_ReturnsCsvFileResult()
    {
        var mockAdminService = new Mock<IAdminReservationService>();
        var sampleReservations = new List<Reservation>
        {
            new()
            {
                Id = 201,
                CustomerId = 88,
                CustomerName = "Kamal Silva",
                CustomerEmail = "kamal@bistro.lk",
                CustomerPhone = "0719876543",
                TableId = 2,
                TableNumber = "T-02",
                BookingReference = "CB-201",
                StartDateTime = new DateTime(2026, 10, 15, 19, 0, 0),
                EndDateTime = new DateTime(2026, 10, 15, 21, 0, 0),
                GuestCount = 2,
                Status = "Confirmed",
                CreatedAt = new DateTime(2026, 10, 10, 10, 0, 0),
                UpdatedAt = new DateTime(2026, 10, 10, 10, 0, 0)
            }
        };

        mockAdminService.Setup(s => s.GetForExportAsync(It.IsAny<AdminReservationQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(sampleReservations);

        var controller = CreateController(mockAdminService);
        var result = await controller.ExportAdminReservations(new AdminReservationQueryDto
        {
            Status = "Confirmed"
        });

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", fileResult.ContentType);
        Assert.EndsWith(".csv", fileResult.FileDownloadName);

        var csvText = Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Contains("Booking Reference", csvText);
        Assert.Contains("CB-201", csvText);
        Assert.Contains("Kamal Silva", csvText);
        Assert.Contains("kamal@bistro.lk", csvText);
    }

    [Fact]
    public void ReservationEndpoints_RBAC_EnforcesAdminRole()
    {
        var getAdminReservationsMethod = typeof(ReservationsController).GetMethod("GetAdminReservations");
        Assert.NotNull(getAdminReservationsMethod);
        var authAttr = getAdminReservationsMethod.GetCustomAttributes(typeof(AuthorizeAttribute), false)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        Assert.NotNull(authAttr);
        Assert.Equal(AppRoles.Admin, authAttr.Roles);

        var exportMethod = typeof(ReservationsController).GetMethod("ExportAdminReservations");
        Assert.NotNull(exportMethod);
        var exportAuthAttr = exportMethod.GetCustomAttributes(typeof(AuthorizeAttribute), false)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        Assert.NotNull(exportAuthAttr);
        Assert.Equal(AppRoles.Admin, exportAuthAttr.Roles);
    }
}
