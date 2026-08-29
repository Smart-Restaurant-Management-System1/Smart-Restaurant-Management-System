using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using IdentityService.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityServiceTests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();
        _configMock = new Mock<IConfiguration>();
        _configMock.Setup(c => c["Staff:AuthorizationCode"]).Returns("BISTRO2026");
        _loggerMock = new Mock<ILogger<AuthService>>();

        _authService = new AuthService(
            _userRepoMock.Object,
            _passwordHasherMock.Object,
            _jwtTokenGeneratorMock.Object,
            _configMock.Object,
            _loggerMock.Object);
    }

    #region Registration Tests

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsInvalidOperationException()
    {
        // Arrange
        var request = new RegisterRequestDto
        {
            FullName = "John Doe",
            Email = "existing@example.com",
            Password = "Password123"
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(new User { UserId = 1, Email = request.Email });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _authService.RegisterAsync(request));
        Assert.Contains("already exists", exception.Message);
    }

    [Fact]
    public async Task RegisterAsync_ValidCustomerRequest_CreatesUserAndReturnsDto()
    {
        // Arrange
        var request = new RegisterRequestDto
        {
            FullName = "Jane Doe",
            Email = "jane@example.com",
            PhoneNumber = "0771234567",
            Password = "Password123",
            Role = "Customer"
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((User?)null);

        _passwordHasherMock.Setup(p => p.HashPassword(request.Password))
            .Returns("$2a$11$mockhashvalue");

        _userRepoMock.Setup(r => r.CreateUserWithRoleAsync(It.IsAny<User>(), "Customer"))
            .ReturnsAsync(42);

        _userRepoMock.Setup(r => r.GetByIdAsync(42))
            .ReturnsAsync(new User
            {
                UserId = 42,
                FullName = "Jane Doe",
                Email = "jane@example.com",
                PhoneNumber = "0771234567",
                IsActive = true,
                Roles = new List<string> { "Customer" },
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(42, result.UserId);
        Assert.Equal("Jane Doe", result.FullName);
        Assert.Equal("jane@example.com", result.Email);
        Assert.Contains("Customer", result.Roles);
    }

    [Fact]
    public async Task RegisterAsync_StaffRequest_InvalidCode_ThrowsInvalidOperationException()
    {
        // Arrange
        var request = new RegisterRequestDto
        {
            FullName = "Chef Gordon",
            Email = "gordon@bistro.com",
            Password = "Password123",
            Role = "KitchenStaff",
            StaffAuthorizationCode = "WRONG_CODE"
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _authService.RegisterAsync(request));
        Assert.Contains("Invalid staff authorization code", exception.Message);
    }

    [Fact]
    public async Task RegisterAsync_StaffRequest_ValidCode_CreatesStaffSuccessfully()
    {
        // Arrange
        var request = new RegisterRequestDto
        {
            FullName = "Manager Alice",
            Email = "alice@bistro.com",
            Password = "Password123",
            Role = "Admin",
            StaffAuthorizationCode = "BISTRO2026"
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((User?)null);

        _passwordHasherMock.Setup(p => p.HashPassword(request.Password))
            .Returns("$2a$11$mockhashvalue");

        _userRepoMock.Setup(r => r.CreateUserWithRoleAsync(It.IsAny<User>(), "Admin"))
            .ReturnsAsync(10);

        _userRepoMock.Setup(r => r.GetByIdAsync(10))
            .ReturnsAsync(new User
            {
                UserId = 10,
                FullName = "Manager Alice",
                Email = "alice@bistro.com",
                IsActive = true,
                Roles = new List<string> { "Admin" },
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10, result.UserId);
        Assert.Contains("Admin", result.Roles);
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponseWithJwtToken()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            Email = "alexander@bistro.com",
            Password = "Password123"
        };

        var user = new User
        {
            UserId = 1,
            FullName = "Alexander Vance",
            Email = "alexander@bistro.com",
            PasswordHash = "$2a$11$hashedpassword",
            IsActive = true,
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _passwordHasherMock.Setup(p => p.VerifyPassword(request.Password, user.PasswordHash))
            .Returns(true);

        _jwtTokenGeneratorMock.Setup(j => j.GenerateToken(user, user.Roles))
            .Returns(("mock.jwt.token.string", DateTime.UtcNow.AddMinutes(60)));

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("mock.jwt.token.string", result.Token);
        Assert.Equal(1, result.UserId);
        Assert.Equal("Alexander Vance", result.FullName);
        Assert.Equal("alexander@bistro.com", result.Email);
        Assert.Contains("Customer", result.Roles);
    }

    [Fact]
    public async Task LoginAsync_NonExistentEmail_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            Email = "nonexistent@bistro.com",
            Password = "Password123"
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync((User?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        Assert.Equal("Invalid email or password.", exception.Message);
    }

    [Fact]
    public async Task LoginAsync_IncorrectPassword_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            Email = "alexander@bistro.com",
            Password = "WrongPassword!"
        };

        var user = new User
        {
            UserId = 1,
            FullName = "Alexander Vance",
            Email = "alexander@bistro.com",
            PasswordHash = "$2a$11$hashedpassword",
            IsActive = true,
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _passwordHasherMock.Setup(p => p.VerifyPassword(request.Password, user.PasswordHash))
            .Returns(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        Assert.Equal("Invalid email or password.", exception.Message);
    }

    [Fact]
    public async Task LoginAsync_InactiveUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var request = new LoginRequestDto
        {
            Email = "banned@bistro.com",
            Password = "Password123"
        };

        var user = new User
        {
            UserId = 5,
            FullName = "Banned User",
            Email = "banned@bistro.com",
            PasswordHash = "$2a$11$hashedpassword",
            IsActive = false,
            Roles = new List<string> { "Customer" }
        };

        _userRepoMock.Setup(r => r.GetByEmailAsync(request.Email))
            .ReturnsAsync(user);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        Assert.Equal("Invalid email or password.", exception.Message);
    }

    #endregion
}
