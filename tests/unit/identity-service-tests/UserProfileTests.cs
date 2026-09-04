using System.Reflection;
using System.Security.Claims;
using IdentityService.Controllers;
using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using IdentityService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityServiceTests;

public class UserProfileTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<ILogger<UserService>> _userServiceLoggerMock;
    private readonly Mock<ILogger<UsersController>> _controllerLoggerMock;
    private readonly UserService _userService;
    private readonly UsersController _controller;

    public UserProfileTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _userServiceLoggerMock = new Mock<ILogger<UserService>>();
        _controllerLoggerMock = new Mock<ILogger<UsersController>>();

        _userService = new UserService(_userRepoMock.Object, _userServiceLoggerMock.Object);
        _controller = new UsersController(_userService, _controllerLoggerMock.Object);
    }

    private void SetUserContext(int? userId, string? email = "test@bistro.com", string role = "Customer")
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
            claims.Add(new Claim("sub", userId.Value.ToString()));
        }
        if (!string.IsNullOrEmpty(email))
        {
            claims.Add(new Claim(ClaimTypes.Email, email));
        }
        if (!string.IsNullOrEmpty(role))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, userId.HasValue ? "TestAuth" : null);
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    #region GET Profile Tests

    [Fact]
    public async Task GetProfile_AuthenticatedUser_RetrievesOwnProfileFromDb()
    {
        // Arrange
        const int userId = 42;
        SetUserContext(userId);

        var dbUser = new User
        {
            UserId = userId,
            FullName = "John Customer",
            Email = "john@example.com",
            PhoneNumber = "+1234567890",
            PasswordHash = "SuperSecretHashShouldNeverLeak",
            IsActive = true,
            Roles = new List<string> { "Customer" },
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(dbUser);

        // Act
        var result = await _controller.GetProfile();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<UserResponseDto>(okResult.Value);
        Assert.Equal(userId, profile.UserId);
        Assert.Equal("John Customer", profile.FullName);
        Assert.Equal("john@example.com", profile.Email);
        Assert.Equal("+1234567890", profile.PhoneNumber);
        Assert.Contains("Customer", profile.Roles);
    }

    [Fact]
    public void GetProfile_NeverExposesPasswordHashOrSensitiveFields()
    {
        // Verify UserResponseDto contract has no Password or PasswordHash fields
        var properties = typeof(UserResponseDto).GetProperties().Select(p => p.Name).ToList();
        Assert.DoesNotContain("PasswordHash", properties);
        Assert.DoesNotContain("Password", properties);
        Assert.DoesNotContain("SecurityStamp", properties);
        Assert.DoesNotContain("Token", properties);
    }

    [Fact]
    public async Task GetProfile_UserNotInDb_ReturnsNotFound()
    {
        // Arrange
        const int userId = 999;
        SetUserContext(userId);
        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.GetProfile();

        // Assert
        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.NotNull(notFound.Value);
    }

    [Fact]
    public async Task GetProfile_MissingIdentityClaims_ReturnsUnauthorized()
    {
        // Arrange: unauthenticated context with no ID claim
        SetUserContext(null);

        // Act
        var result = await _controller.GetProfile();

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    #endregion

    #region PUT Profile Tests

    [Fact]
    public async Task UpdateProfile_ValidContactData_UpdatesOnlyAuthenticatedUser()
    {
        // Arrange
        const int userId = 10;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            FullName = "Old Name",
            Email = "old@example.com",
            PhoneNumber = "0771234567",
            PasswordHash = "hashed_pass",
            Roles = new List<string> { "Customer" }
        };

        var request = new UpdateProfileRequestDto
        {
            FullName = "New Updated Name",
            Email = "new@example.com",
            PhoneNumber = "+94771234567"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _userRepoMock.Setup(r => r.GetByEmailAsync("new@example.com")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.UpdateUserProfileAsync(userId, "New Updated Name", "new@example.com", "+94771234567"))
            .ReturnsAsync(true);

        var updatedUser = new User
        {
            UserId = userId,
            FullName = "New Updated Name",
            Email = "new@example.com",
            PhoneNumber = "+94771234567",
            PasswordHash = "hashed_pass",
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.SetupSequence(r => r.GetByIdAsync(userId))
            .ReturnsAsync(existingUser)
            .ReturnsAsync(updatedUser);

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<UserResponseDto>(okResult.Value);
        Assert.Equal("New Updated Name", profile.FullName);
        Assert.Equal("new@example.com", profile.Email);
        Assert.Equal("+94771234567", profile.PhoneNumber);

        // Verify update was called specifically with the authenticated user ID
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(userId, "New Updated Name", "new@example.com", "+94771234567"), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_DuplicateEmailByAnotherUser_ReturnsConflict()
    {
        // Arrange
        const int userId = 10;
        const int anotherUserId = 99;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            FullName = "Alice",
            Email = "alice@example.com"
        };

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "bob@example.com", // Belongs to another user
            PhoneNumber = null
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _userRepoMock.Setup(r => r.GetByEmailAsync("bob@example.com"))
            .ReturnsAsync(new User { UserId = anotherUserId, Email = "bob@example.com" });

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(conflict.Value);
    }

    [Fact]
    public async Task UpdateProfile_UserNotFound_ReturnsNotFound()
    {
        // Arrange
        const int userId = 404;
        SetUserContext(userId);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Ghost",
            Email = "ghost@example.com"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public void UpdateProfileRequestDto_PreventsMassAssignmentOfProtectedFields()
    {
        // Verify UpdateProfileRequestDto only defines allowed contact fields
        var properties = typeof(UpdateProfileRequestDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToList();

        Assert.Equal(3, properties.Count);
        Assert.Contains("FullName", properties);
        Assert.Contains("Email", properties);
        Assert.Contains("PhoneNumber", properties);

        Assert.DoesNotContain("UserId", properties);
        Assert.DoesNotContain("Role", properties);
        Assert.DoesNotContain("Roles", properties);
        Assert.DoesNotContain("Password", properties);
        Assert.DoesNotContain("PasswordHash", properties);
        Assert.DoesNotContain("IsActive", properties);
        Assert.DoesNotContain("CreatedAt", properties);
    }

    #endregion

    #region Security & Endpoint Attributes Tests

    [Fact]
    public void UsersController_Endpoints_EnforceAuthorizeAttribute()
    {
        var controllerType = typeof(UsersController);

        // Check controller-level Authorize or action-level Authorize
        var hasClassAuthorize = controllerType.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();

        var getMethod = controllerType.GetMethod(nameof(UsersController.GetProfile));
        var putMethod = controllerType.GetMethod(nameof(UsersController.UpdateProfile));

        Assert.NotNull(getMethod);
        Assert.NotNull(putMethod);

        var hasGetAuthorize = hasClassAuthorize || getMethod.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();
        var hasPutAuthorize = hasClassAuthorize || putMethod.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();

        Assert.True(hasGetAuthorize, "GET /api/users/profile must require Authorize attribute");
        Assert.True(hasPutAuthorize, "PUT /api/users/profile must require Authorize attribute");
    }

    #endregion
}
