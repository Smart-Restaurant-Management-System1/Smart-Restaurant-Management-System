using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ReservationServiceTests;

public class AdminAuditLogTests
{
    [Fact]
    public void SanitizeAndSerialize_RedactsPasswordsTokensAndSecrets()
    {
        // Arrange
        var unsafePayload = new Dictionary<string, object>
        {
            ["Username"] = "admin_user",
            ["Password"] = "SuperSecretP@ssw0rd!",
            ["Token"] = "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis",
            ["SecretKey"] = "my_top_secret_api_key_12345",
            ["Cvv"] = "999",
            ["Action"] = "BLOCK_USER",
            ["TargetUserId"] = 42
        };

        // Act
        var resultJson = AuditDataSanitizer.SanitizeAndSerialize(unsafePayload);

        // Assert
        Assert.NotNull(resultJson);
        Assert.DoesNotContain("SuperSecretP@ssw0rd!", resultJson);
        Assert.DoesNotContain("doNotLeakThis", resultJson);
        Assert.DoesNotContain("my_top_secret_api_key_12345", resultJson);
        Assert.DoesNotContain("999", resultJson);
        Assert.Contains("[REDACTED]", resultJson);
        Assert.Contains("admin_user", resultJson);
        Assert.Contains("BLOCK_USER", resultJson);
        Assert.Contains("42", resultJson);
    }

    [Fact]
    public void SanitizeAndSerialize_MasksJwtInRawString()
    {
        // Arrange
        var rawTextWithJwt = "Admin initiated login with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTUiLCJlbWFpbCI6ImFkbWluQGJpc3Ryby5jb20ifQ.abcdef1234567890abcdef for session";

        // Act
        var sanitized = AuditDataSanitizer.SanitizeAndSerialize(rawTextWithJwt);

        // Assert
        Assert.NotNull(sanitized);
        Assert.DoesNotContain("abcdef1234567890abcdef", sanitized);
        Assert.Contains("[REDACTED_JWT]", sanitized);
    }

    [Fact]
    public void SanitizeAndSerialize_MasksConnectionStringInRawString()
    {
        // Arrange
        var rawTextWithConn = "Failed query to Server=localhost;Database=secret_db;User ID=root;Password=MySqlSecret123!;";

        // Act
        var sanitized = AuditDataSanitizer.SanitizeAndSerialize(rawTextWithConn);

        // Assert
        Assert.NotNull(sanitized);
        Assert.DoesNotContain("MySqlSecret123!", sanitized);
        Assert.Contains("Password=[REDACTED];", sanitized);
    }

    [Fact]
    public void SanitizeAndSerialize_PreservesSafeBusinessProperties()
    {
        // Arrange
        var safeMetadata = new
        {
            ItemName = "Cinnamon Spiced Chicken",
            Price = 24.50m,
            Category = "Main Course",
            IsAvailable = false,
            Reason = "Out of fresh organic spice"
        };

        // Act
        var resultJson = AuditDataSanitizer.SanitizeAndSerialize(safeMetadata);

        // Assert
        Assert.NotNull(resultJson);
        Assert.Contains("Cinnamon Spiced Chicken", resultJson);
        Assert.Contains("24.50", resultJson);
        Assert.Contains("Main Course", resultJson);
        Assert.Contains("Out of fresh organic spice", resultJson);
    }

    [Fact]
    public void SanitizeAndSerialize_HandlesNullAndEmptySafely()
    {
        Assert.Null(AuditDataSanitizer.SanitizeAndSerialize(null));
        Assert.Equal(string.Empty, AuditDataSanitizer.SanitizeAndSerialize(string.Empty));
    }

    [Fact]
    public async Task AuditLogWriter_InsertsSanitizedLogEntrySuccessfully()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var mockLogger = new Mock<ILogger<AuditLogWriter>>();

        AdminAuditLog? capturedLog = null;
        mockRepo.Setup(r => r.InsertAsync(It.IsAny<AdminAuditLog>(), It.IsAny<CancellationToken>()))
            .Callback<AdminAuditLog, CancellationToken>((log, _) => capturedLog = log)
            .ReturnsAsync(101L);

        var writer = new AuditLogWriter(mockRepo.Object, mockLogger.Object);

        // Act
        await writer.LogAsync(
            actionType: AuditActionTypes.MenuItemCreated,
            adminId: 1,
            adminEmail: "admin@cinnamonbistro.com",
            targetType: AuditActionTypes.Targets.MenuItem,
            targetId: "5",
            result: AuditActionTypes.Results.Success,
            details: new { ItemName = "Apple Tart", Price = 8.50m, Token = "secret-token-to-mask" });

        // Assert
        mockRepo.Verify(r => r.InsertAsync(It.IsAny<AdminAuditLog>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(capturedLog);
        Assert.Equal(AuditActionTypes.MenuItemCreated, capturedLog.ActionType);
        Assert.Equal(1, capturedLog.AdminId);
        Assert.Equal("admin@cinnamonbistro.com", capturedLog.AdminEmail);
        Assert.Equal("MenuItem", capturedLog.TargetType);
        Assert.Equal("5", capturedLog.TargetId);
        Assert.Equal("Success", capturedLog.Result);
        Assert.NotNull(capturedLog.DetailsJson);
        Assert.Contains("Apple Tart", capturedLog.DetailsJson);
        Assert.DoesNotContain("secret-token-to-mask", capturedLog.DetailsJson);
        Assert.Contains("[REDACTED]", capturedLog.DetailsJson);
    }

    [Fact]
    public async Task AuditLogWriter_FailsGracefully_WhenRepositoryThrows()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var mockLogger = new Mock<ILogger<AuditLogWriter>>();

        mockRepo.Setup(r => r.InsertAsync(It.IsAny<AdminAuditLog>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("DB unavailable"));

        var writer = new AuditLogWriter(mockRepo.Object, mockLogger.Object);

        // Act & Assert (must not throw exception, fail-safe)
        var exception = await Record.ExceptionAsync(() => writer.LogAsync(
            actionType: AuditActionTypes.UserBlocked,
            adminId: 2,
            adminEmail: "admin@bistro.com",
            targetType: AuditActionTypes.Targets.User,
            targetId: "10"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task MenuItemsController_RecordsAuditLog_OnCreateAndAvailabilityChange()
    {
        // Arrange
        var mockMenuRepo = new Mock<IMenuItemRepository>();
        var mockImageStorage = new Mock<IImageStorageService>();
        var mockAuditWriter = new Mock<IAuditLogWriter>();

        mockMenuRepo.Setup(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        mockMenuRepo.Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MenuItem { MenuItemId = 42, ItemName = "Spicy Prawn Curry", Price = 18.00m, Category = "Main Course", DietaryInfo = "None", IsAvailable = true });
        mockMenuRepo.Setup(r => r.UpdateAvailabilityAsync(42, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var controller = new ReservationService.Controllers.MenuItemsController(
            mockMenuRepo.Object,
            mockImageStorage.Object,
            mockAuditWriter.Object);

        // Simulate authenticated Admin user
        var claims = new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "headadmin@bistro.com"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, AppRoles.Admin)
        };
        controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "TestAuth"))
            }
        };

        // Act 1: Create
        var createRequest = new MenuItemRequest
        {
            ItemName = "Spicy Prawn Curry",
            Category = "Main Course",
            Price = 18.00m,
            DietaryInfo = "None",
            IsAvailable = true
        };
        var createRes = await controller.Create(createRequest);
        Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(createRes);

        mockAuditWriter.Verify(a => a.LogAsync(
            AuditActionTypes.MenuItemCreated,
            1,
            "headadmin@bistro.com",
            AuditActionTypes.Targets.MenuItem,
            "42",
            AuditActionTypes.Results.Success,
            It.IsAny<object>(),
            "Admin",
            AuditActionTypes.Services.ReservationService,
            null,
            default), Times.Once);

        // Act 2: Update availability
        var patchRes = await controller.UpdateAvailability(42, new AvailabilityRequest { IsAvailable = false });
        Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(patchRes);

        mockAuditWriter.Verify(a => a.LogAsync(
            AuditActionTypes.MenuAvailabilityChanged,
            1,
            "headadmin@bistro.com",
            AuditActionTypes.Targets.MenuItem,
            "42",
            AuditActionTypes.Results.Success,
            It.IsAny<object>(),
            "Admin",
            AuditActionTypes.Services.ReservationService,
            null,
            default), Times.Once);
    }

    [Fact]
    public async Task TablesController_RecordsAuditLog_OnCreateTableAndSoftDelete()
    {
        // Arrange
        var mockTableRepo = new Mock<ITableRepository>();
        var mockLogger = new Mock<ILogger<ReservationService.Controllers.TablesController>>();
        var mockAuditWriter = new Mock<IAuditLogWriter>();

        mockTableRepo.Setup(r => r.CreateTableAsync(It.IsAny<RestaurantTable>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RestaurantTable { Id = 10, TableNumber = "T-10", Capacity = 4, Location = "Patio", IsActive = true });
        mockTableRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RestaurantTable { Id = 10, TableNumber = "T-10", Capacity = 4, Location = "Patio", IsActive = true, Status = "Available" });
        mockTableRepo.Setup(r => r.SoftDeleteTableAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(TableDeactivationResult.Success);

        var controller = new ReservationService.Controllers.TablesController(
            mockTableRepo.Object,
            mockLogger.Object,
            mockAuditWriter.Object);

        var claims = new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "3"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "manager@bistro.com"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, AppRoles.Admin)
        };
        controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "TestAuth"))
            }
        };

        // Act 1: Create table
        var createRes = await controller.CreateTable(new CreateTableRequestDto { TableNumber = "T-10", Capacity = 4, Location = "Patio" });
        Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(createRes);

        mockAuditWriter.Verify(a => a.LogAsync(
            AuditActionTypes.TableCreated,
            3,
            "manager@bistro.com",
            AuditActionTypes.Targets.Table,
            "10",
            AuditActionTypes.Results.Success,
            It.IsAny<object>(),
            "Admin",
            AuditActionTypes.Services.ReservationService,
            null,
            default), Times.Once);

        // Act 2: Soft delete table
        var deleteRes = await controller.DeleteTable(10);
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(deleteRes);

        mockAuditWriter.Verify(a => a.LogAsync(
            AuditActionTypes.TableDeleted,
            3,
            "manager@bistro.com",
            AuditActionTypes.Targets.Table,
            "10",
            AuditActionTypes.Results.Success,
            It.IsAny<object>(),
            "Admin",
            AuditActionTypes.Services.ReservationService,
            null,
            default), Times.Once);
    }

    [Fact]
    public async Task AdminAuditLogsController_RejectsInvertedDateRange_WithBadRequest()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var mockLogger = new Mock<ILogger<AdminAuditLogsController>>();
        var controller = new AdminAuditLogsController(mockRepo.Object, mockLogger.Object);

        var query = new AdminAuditLogQueryDto
        {
            FromDate = DateTime.UtcNow.Date,
            ToDate = DateTime.UtcNow.Date.AddDays(-5) // inverted
        };

        // Act
        var result = await controller.GetAuditLogs(query, default);

        // Assert
        var badReq = Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(result);
        Assert.NotNull(badReq.Value);
    }

    [Fact]
    public async Task AdminAuditLogsController_RejectsRangeExceeding90Days_WithBadRequest()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var mockLogger = new Mock<ILogger<AdminAuditLogsController>>();
        var controller = new AdminAuditLogsController(mockRepo.Object, mockLogger.Object);

        var query = new AdminAuditLogQueryDto
        {
            FromDate = DateTime.UtcNow.Date.AddDays(-100),
            ToDate = DateTime.UtcNow.Date
        };

        // Act
        var result = await controller.GetAuditLogs(query, default);

        // Assert
        var badReq = Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(result);
        Assert.NotNull(badReq.Value);
    }

    [Fact]
    public async Task AdminAuditLogsController_ReturnsPagedResults_OnValidQuery()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var mockLogger = new Mock<ILogger<AdminAuditLogsController>>();

        var expectedResult = new PagedAuditLogsResultDto
        {
            TotalCount = 1,
            Page = 1,
            PageSize = 20,
            Items = new List<AdminAuditLogResponseDto>
            {
                new()
                {
                    AuditLogId = 1,
                    ActionType = AuditActionTypes.UserBlocked,
                    AdminId = 1,
                    AdminEmail = "admin@bistro.com",
                    TargetType = "User",
                    TargetId = "10",
                    Result = "Success"
                }
            }
        };

        mockRepo.Setup(r => r.GetPagedAuditLogsAsync(It.IsAny<AdminAuditLogQueryDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResult);

        var controller = new AdminAuditLogsController(mockRepo.Object, mockLogger.Object);

        // Act
        var result = await controller.GetAuditLogs(new AdminAuditLogQueryDto(), default);

        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
        var paged = Assert.IsType<PagedAuditLogsResultDto>(okResult.Value);
        Assert.Equal(1, paged.TotalCount);
        Assert.Single(paged.Items);
    }
}
