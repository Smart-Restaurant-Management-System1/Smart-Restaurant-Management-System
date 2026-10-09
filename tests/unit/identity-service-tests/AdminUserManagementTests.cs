using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using IdentityService.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityServiceTests;

public class AdminUserManagementTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<ILogger<UserService>> _loggerMock;
    private readonly UserService _userService;

    public AdminUserManagementTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _loggerMock = new Mock<ILogger<UserService>>();
        _userService = new UserService(_userRepoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetAdminUsersAsync_ReturnsPagedUsers_AndMetrics()
    {
        // Arrange
        var mockUsers = new List<User>
        {
            new() { UserId = 1, FullName = "Alice Admin", Email = "alice@bistro.lk", Roles = new List<string> { "Admin" }, Status = "Active", IsActive = true },
            new() { UserId = 2, FullName = "Bob Customer", Email = "bob@bistro.lk", Roles = new List<string> { "Customer" }, Status = "Blocked", IsActive = false }
        };
        var mockMetrics = new AdminUserMetricsDto
        {
            TotalUsers = 2,
            TotalCustomers = 1,
            TotalStaff = 1,
            TotalActive = 1,
            TotalBlocked = 1,
            TotalInactive = 0
        };

        _userRepoMock.Setup(r => r.GetUsersPagedAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), 1, 10))
            .ReturnsAsync((mockUsers, 2, mockMetrics));

        var query = new AdminUserQueryDto { Page = 1, PageSize = 10 };

        // Act
        var result = await _userService.GetAdminUsersAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(1, result.Metrics.TotalActive);
        Assert.Equal(1, result.Metrics.TotalBlocked);
        Assert.Equal("Active", result.Items[0].Status);
        Assert.Equal("Blocked", result.Items[1].Status);
    }

    [Fact]
    public async Task UpdateUserStatusAsync_BlockActiveCustomer_UpdatesStatusSuccessfully()
    {
        // Arrange
        int targetUserId = 10;
        int currentAdminId = 1;
        var existingUser = new User
        {
            UserId = targetUserId,
            FullName = "John Customer",
            Email = "john@example.com",
            Status = "Active",
            IsActive = true,
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(targetUserId))
            .ReturnsAsync(existingUser);
        _userRepoMock.Setup(r => r.UpdateUserStatusAsync(targetUserId, "Blocked", false))
            .ReturnsAsync(true);

        // Act
        var result = await _userService.UpdateUserStatusAsync(targetUserId, currentAdminId, "Blocked", "Violation of terms");

        // Assert
        Assert.NotNull(result);
        _userRepoMock.Verify(r => r.UpdateUserStatusAsync(targetUserId, "Blocked", false), Times.Once);
    }

    [Fact]
    public async Task UpdateUserStatusAsync_UnblockCustomer_UpdatesStatusToActive()
    {
        // Arrange
        int targetUserId = 10;
        int currentAdminId = 1;
        var existingUser = new User
        {
            UserId = targetUserId,
            FullName = "John Customer",
            Email = "john@example.com",
            Status = "Blocked",
            IsActive = false,
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(targetUserId))
            .ReturnsAsync(existingUser);
        _userRepoMock.Setup(r => r.UpdateUserStatusAsync(targetUserId, "Active", true))
            .ReturnsAsync(true);

        // Act
        var result = await _userService.UpdateUserStatusAsync(targetUserId, currentAdminId, "Active", "Issue resolved");

        // Assert
        Assert.NotNull(result);
        _userRepoMock.Verify(r => r.UpdateUserStatusAsync(targetUserId, "Active", true), Times.Once);
    }

    [Fact]
    public async Task UpdateUserStatusAsync_TargetIsSelf_ThrowsInvalidOperationException()
    {
        // Arrange
        int currentAdminId = 1;

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _userService.UpdateUserStatusAsync(currentAdminId, currentAdminId, "Blocked", null));

        Assert.Contains("own administrative account", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateUserStatusAsync_LastAdmin_ThrowsInvalidOperationException()
    {
        // Arrange
        int currentAdminId = 1;
        int targetAdminId = 2;
        var targetAdmin = new User
        {
            UserId = targetAdminId,
            Email = "other_admin@bistro.lk",
            Roles = new List<string> { "Admin" },
            Status = "Active",
            IsActive = true
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(targetAdminId))
            .ReturnsAsync(targetAdmin);
        _userRepoMock.Setup(r => r.GetActiveAdminCountAsync())
            .ReturnsAsync(1); // Only 1 active admin left!

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _userService.UpdateUserStatusAsync(targetAdminId, currentAdminId, "Blocked", null));

        Assert.Contains("only remaining active Administrator", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeleteUserAsync_TargetIsSelf_ThrowsInvalidOperationException()
    {
        // Arrange
        int currentAdminId = 1;

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _userService.DeleteUserAsync(currentAdminId, currentAdminId));

        Assert.Contains("own administrative account", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeleteUserAsync_LastAdmin_ThrowsInvalidOperationException()
    {
        // Arrange
        int currentAdminId = 1;
        int targetAdminId = 2;
        var targetAdmin = new User
        {
            UserId = targetAdminId,
            Email = "last_admin@bistro.lk",
            Roles = new List<string> { "Admin" },
            Status = "Active",
            IsActive = true
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(targetAdminId))
            .ReturnsAsync(targetAdmin);
        _userRepoMock.Setup(r => r.GetActiveAdminCountAsync())
            .ReturnsAsync(1);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _userService.DeleteUserAsync(targetAdminId, currentAdminId));

        Assert.Contains("only remaining active Administrator", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeleteUserAsync_ValidCustomer_PerformsSoftDelete()
    {
        // Arrange
        int currentAdminId = 1;
        int targetUserId = 20;
        var customer = new User
        {
            UserId = targetUserId,
            Email = "cust@bistro.lk",
            Roles = new List<string> { "Customer" },
            Status = "Active",
            IsActive = true
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(targetUserId))
            .ReturnsAsync(customer);
        _userRepoMock.Setup(r => r.SoftDeleteUserAsync(targetUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _userService.DeleteUserAsync(targetUserId, currentAdminId);

        // Assert
        Assert.True(result);
        _userRepoMock.Verify(r => r.SoftDeleteUserAsync(targetUserId), Times.Once);
    }

    [Fact]
    public async Task UpdateUserStatusAsync_CallsAuditWriter_OnBlockAndUnblock()
    {
        // Arrange
        var auditMock = new Mock<IIdentityAuditWriter>();
        var userServiceWithAudit = new UserService(_userRepoMock.Object, _loggerMock.Object, auditMock.Object);

        int currentAdminId = 1;
        int targetUserId = 15;
        var adminUser = new User { UserId = 1, Email = "admin@bistro.lk", Roles = new List<string> { "Admin" } };
        var customer = new User { UserId = targetUserId, Email = "badguy@bistro.lk", Roles = new List<string> { "Customer" }, Status = "Active", IsActive = true };

        _userRepoMock.Setup(r => r.GetByIdAsync(currentAdminId)).ReturnsAsync(adminUser);
        _userRepoMock.Setup(r => r.GetByIdAsync(targetUserId)).ReturnsAsync(customer);
        _userRepoMock.Setup(r => r.UpdateUserStatusAsync(targetUserId, "Blocked", false)).ReturnsAsync(true);

        // Act
        var response = await userServiceWithAudit.UpdateUserStatusAsync(targetUserId, currentAdminId, "Blocked", "Violation of policy");

        // Assert
        Assert.NotNull(response);
        auditMock.Verify(a => a.LogActionAsync(
            "USER_BLOCKED",
            currentAdminId,
            "admin@bistro.lk",
            "User",
            targetUserId.ToString(),
            "Success",
            It.IsAny<object>(),
            null,
            default), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_CallsAuditWriter_OnSuccessAndOnDenied()
    {
        // Arrange
        var auditMock = new Mock<IIdentityAuditWriter>();
        var userServiceWithAudit = new UserService(_userRepoMock.Object, _loggerMock.Object, auditMock.Object);

        int currentAdminId = 1;
        int targetUserId = 25;
        var adminUser = new User { UserId = 1, Email = "superadmin@bistro.lk", Roles = new List<string> { "Admin" } };
        var targetUser = new User { UserId = targetUserId, Email = "todelete@bistro.lk", Roles = new List<string> { "Customer" }, Status = "Active", IsActive = true };

        _userRepoMock.Setup(r => r.GetByIdAsync(currentAdminId)).ReturnsAsync(adminUser);
        _userRepoMock.Setup(r => r.GetByIdAsync(targetUserId)).ReturnsAsync(targetUser);
        _userRepoMock.Setup(r => r.SoftDeleteUserAsync(targetUserId)).ReturnsAsync(true);

        // Act 1: Success delete
        var res = await userServiceWithAudit.DeleteUserAsync(targetUserId, currentAdminId);
        Assert.True(res);
        auditMock.Verify(a => a.LogActionAsync(
            "USER_DELETED",
            currentAdminId,
            "superadmin@bistro.lk",
            "User",
            targetUserId.ToString(),
            "Success",
            It.IsAny<object>(),
            null,
            default), Times.Once);

        // Act 2: Self delete attempt (Denied)
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            userServiceWithAudit.DeleteUserAsync(currentAdminId, currentAdminId));

        auditMock.Verify(a => a.LogActionAsync(
            "USER_DELETE_DENIED",
            currentAdminId,
            It.IsAny<string>(),
            "User",
            currentAdminId.ToString(),
            "Denied",
            It.IsAny<object>(),
            null,
            default), Times.Once);
    }
}


