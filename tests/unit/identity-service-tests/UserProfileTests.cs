using System.ComponentModel.DataAnnotations;
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
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly UserService _userService;
    private readonly UsersController _controller;

    public UserProfileTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _userServiceLoggerMock = new Mock<ILogger<UserService>>();
        _controllerLoggerMock = new Mock<ILogger<UsersController>>();
        _passwordHasherMock = new Mock<IPasswordHasher>();

        _userService = new UserService(_userRepoMock.Object, _userServiceLoggerMock.Object, null, _passwordHasherMock.Object);
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
            PhoneNumber = "0779876543"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _userRepoMock.Setup(r => r.GetByEmailAsync("new@example.com")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.UpdateUserProfileAsync(userId, "New Updated Name", "new@example.com", "0779876543"))
            .ReturnsAsync(true);

        var updatedUser = new User
        {
            UserId = userId,
            FullName = "New Updated Name",
            Email = "new@example.com",
            PhoneNumber = "0779876543",
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
        Assert.Equal("0779876543", profile.PhoneNumber);

        // Verify update was called specifically with the authenticated user ID
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(userId, "New Updated Name", "new@example.com", "0779876543"), Times.Once);
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

    #region SR-297: Phone Number Maximum Length Validation Tests

    [Fact]
    public async Task UpdateProfile_PhoneExactlyAtMaxLength10_ReturnsOkAndSaves()
    {
        // Arrange - phone number is exactly 10 digits
        const int userId = 10;
        const string max10Phone = "0771234567"; // exactly 10 digits
        Assert.Equal(10, max10Phone.Length);

        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "0770000000"
        };

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = max10Phone
        };

        var updatedUser = new User
        {
            UserId = userId,
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = max10Phone
        };

        _userRepoMock.SetupSequence(r => r.GetByIdAsync(userId))
            .ReturnsAsync(existingUser)
            .ReturnsAsync(updatedUser);
        _userRepoMock.Setup(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", max10Phone))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<UserResponseDto>(okResult.Value);
        Assert.Equal(max10Phone, profile.PhoneNumber);

        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", max10Phone), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_PhoneOneCharOverMaxLength11_ReturnsBadRequestAndDbUnchanged()
    {
        // Arrange - phone number is 11 characters (1 char over maximum 10)
        const int userId = 10;
        const string over11Phone = "07712345678"; // 11 chars
        Assert.Equal(11, over11Phone.Length);

        SetUserContext(userId);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = over11Phone
        };

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert - must return 400 Bad Request
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var messageProp = badRequest.Value?.GetType().GetProperty("message");
        var message = messageProp?.GetValue(badRequest.Value)?.ToString();
        Assert.Equal("Phone number must not exceed 10 characters", message);

        // Database write must NEVER be invoked
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_PhoneVeryLong500Chars_ReturnsBadRequestAndDbUnchanged()
    {
        // Arrange - phone number is excessively long (500 chars)
        const int userId = 10;
        var veryLongPhone = new string('9', 500);

        SetUserContext(userId);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = veryLongPhone
        };

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var messageProp = badRequest.Value?.GetType().GetProperty("message");
        var message = messageProp?.GetValue(badRequest.Value)?.ToString();
        Assert.Equal("Phone number must not exceed 10 characters", message);

        // Database write must NEVER be invoked
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_PhoneUnder10Digits_ReturnsBadRequestAndDbUnchanged()
    {
        // Arrange - phone number has less than 10 digits
        const int userId = 10;
        const string under10Phone = "077123456"; // 9 digits
        Assert.Equal(9, under10Phone.Length);

        SetUserContext(userId);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = under10Phone
        };

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var messageProp = badRequest.Value?.GetType().GetProperty("message");
        var message = messageProp?.GetValue(badRequest.Value)?.ToString();
        Assert.Equal("Phone number must be exactly 10 digits", message);

        // Database write must NEVER be invoked
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_PhoneValidLengthInvalidCharacters_ReturnsBadRequest()
    {
        // Arrange - phone has valid length (10 chars) but invalid characters
        const int userId = 10;
        const string invalidFormatPhone = "077123456a";

        SetUserContext(userId);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = invalidFormatPhone
        };

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var messageProp = badRequest.Value?.GetType().GetProperty("message");
        var message = messageProp?.GetValue(badRequest.Value)?.ToString();
        Assert.Equal("Invalid phone number format", message);

        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_EmptyOrNullPhone_PreservesExistingBehaviour()
    {
        // Arrange - null or empty phone should be accepted as optional
        const int userId = 10;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "0771234567"
        };

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = null
        };

        var updatedUser = new User
        {
            UserId = userId,
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = null
        };

        _userRepoMock.SetupSequence(r => r.GetByIdAsync(userId))
            .ReturnsAsync(existingUser)
            .ReturnsAsync(updatedUser);
        _userRepoMock.Setup(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", null))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", null), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_PhoneWithWhitespaceAroundValidNumber_TrimsWhitespaceAndSaves()
    {
        // Arrange - 16 characters with whitespace, but 10 digits after trim
        const int userId = 10;
        const string paddedPhone = "   0771234567   ";
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "0770000000"
        };

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = paddedPhone
        };

        var updatedUser = new User
        {
            UserId = userId,
            FullName = "Alice Updated",
            Email = "alice@example.com",
            PhoneNumber = "0771234567"
        };

        _userRepoMock.SetupSequence(r => r.GetByIdAsync(userId))
            .ReturnsAsync(existingUser)
            .ReturnsAsync(updatedUser);
        _userRepoMock.Setup(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", "0771234567"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(userId, "Alice Updated", "alice@example.com", "0771234567"), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_UnauthenticatedRequest_ReturnsUnauthorized()
    {
        // Arrange - user context is null (unauthenticated)
        SetUserContext(null);

        var request = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "0771234567"
        };

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
        _userRepoMock.Verify(r => r.UpdateUserProfileAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void UpdateProfileRequestDto_ValidationAttributes_EnforceMax10Characters()
    {
        // Validate exactly 10 digits
        var validDto = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "0771234567"
        };
        var validContext = new ValidationContext(validDto);
        var validResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(validDto, validContext, validResults, true);
        Assert.True(isValid);

        // Validate 11 characters fails with exact message
        var over11Dto = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "07712345678"
        };
        var invalidContext = new ValidationContext(over11Dto);
        var invalidResults = new List<ValidationResult>();
        var isInvalid = Validator.TryValidateObject(over11Dto, invalidContext, invalidResults, true);
        Assert.False(isInvalid);
        Assert.Contains(invalidResults, r => r.ErrorMessage == "Phone number must not exceed 10 characters");

        // Validate 9 digits fails with exact message
        var under10Dto = new UpdateProfileRequestDto
        {
            FullName = "Alice",
            Email = "alice@example.com",
            PhoneNumber = "077123456"
        };
        var underContext = new ValidationContext(under10Dto);
        var underResults = new List<ValidationResult>();
        var isUnderInvalid = Validator.TryValidateObject(under10Dto, underContext, underResults, true);
        Assert.False(isUnderInvalid);
        Assert.Contains(underResults, r => r.ErrorMessage == "Phone number must be exactly 10 digits");
    }

    #endregion

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
        var changePasswordMethod = controllerType.GetMethod(nameof(UsersController.ChangePassword));

        Assert.NotNull(getMethod);
        Assert.NotNull(putMethod);
        Assert.NotNull(changePasswordMethod);

        var hasGetAuthorize = hasClassAuthorize || getMethod.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();
        var hasPutAuthorize = hasClassAuthorize || putMethod.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();
        var hasChangePasswordAuthorize = hasClassAuthorize || changePasswordMethod.GetCustomAttributes(typeof(AuthorizeAttribute), true).Any();

        Assert.True(hasGetAuthorize, "GET /api/users/profile must require Authorize attribute");
        Assert.True(hasPutAuthorize, "PUT /api/users/profile must require Authorize attribute");
        Assert.True(hasChangePasswordAuthorize, "POST /api/users/change-password must require Authorize attribute");
    }

    #endregion

    #region Change Password Tests (SR-224 / SR-255 / SR-256)

    [Fact]
    public async Task ChangePassword_ValidCredentials_SuccessfullyUpdatesPassword()
    {
        // Arrange
        const int userId = 10;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            Email = "customer@bistro.com",
            PasswordHash = "old_hashed_password"
        };

        var request = new ChangePasswordRequestDto
        {
            CurrentPassword = "CurrentPassword123!",
            NewPassword = "NewSecurePassword456!",
            ConfirmPassword = "NewSecurePassword456!"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _passwordHasherMock.Setup(h => h.VerifyPassword("CurrentPassword123!", "old_hashed_password")).Returns(true);
        _passwordHasherMock.Setup(h => h.VerifyPassword("NewSecurePassword456!", "old_hashed_password")).Returns(false);
        _passwordHasherMock.Setup(h => h.HashPassword("NewSecurePassword456!")).Returns("new_hashed_password");
        _userRepoMock.Setup(r => r.UpdatePasswordHashAsync(userId, "new_hashed_password")).ReturnsAsync(true);

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
        _userRepoMock.Verify(r => r.UpdatePasswordHashAsync(userId, "new_hashed_password"), Times.Once);
    }

    [Fact]
    public async Task ChangePassword_IncorrectCurrentPassword_ReturnsBadRequest()
    {
        // Arrange
        const int userId = 10;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            Email = "customer@bistro.com",
            PasswordHash = "old_hashed_password"
        };

        var request = new ChangePasswordRequestDto
        {
            CurrentPassword = "WrongPassword!",
            NewPassword = "NewPassword123!",
            ConfirmPassword = "NewPassword123!"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _passwordHasherMock.Setup(h => h.VerifyPassword("WrongPassword!", "old_hashed_password")).Returns(false);

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
        _userRepoMock.Verify(r => r.UpdatePasswordHashAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ChangePassword_SameNewPasswordAsCurrent_ReturnsBadRequest()
    {
        // Arrange
        const int userId = 10;
        SetUserContext(userId);

        var existingUser = new User
        {
            UserId = userId,
            Email = "customer@bistro.com",
            PasswordHash = "old_hashed_password"
        };

        var request = new ChangePasswordRequestDto
        {
            CurrentPassword = "SamePassword123!",
            NewPassword = "SamePassword123!",
            ConfirmPassword = "SamePassword123!"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(existingUser);
        _passwordHasherMock.Setup(h => h.VerifyPassword("SamePassword123!", "old_hashed_password")).Returns(true);

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
        _userRepoMock.Verify(r => r.UpdatePasswordHashAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ChangePassword_UserNotFound_ReturnsNotFound()
    {
        // Arrange
        const int userId = 999;
        SetUserContext(userId);

        var request = new ChangePasswordRequestDto
        {
            CurrentPassword = "CurrentPass123!",
            NewPassword = "NewPass123!",
            ConfirmPassword = "NewPass123!"
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_MissingIdentity_ReturnsUnauthorized()
    {
        // Arrange: unauthenticated user
        SetUserContext(null);

        var request = new ChangePasswordRequestDto
        {
            CurrentPassword = "CurrentPass123!",
            NewPassword = "NewPass123!",
            ConfirmPassword = "NewPass123!"
        };

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public void ChangePasswordRequestDto_RequiresAnnotations()
    {
        var properties = typeof(ChangePasswordRequestDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToList();

        Assert.Equal(3, properties.Count);
        Assert.Contains("CurrentPassword", properties);
        Assert.Contains("NewPassword", properties);
        Assert.Contains("ConfirmPassword", properties);
    }

    #endregion
}
