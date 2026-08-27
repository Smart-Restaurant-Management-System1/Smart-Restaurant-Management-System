using IdentityService.Services;
using Xunit;

namespace IdentityServiceTests;

public class PasswordHasherTests
{
    private readonly IPasswordHasher _hasher;

    public PasswordHasherTests()
    {
        _hasher = new BcryptPasswordHasher();
    }

    [Fact]
    public void HashPassword_ShouldReturnValidBcryptHash()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = _hasher.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.StartsWith("", hash); // Standard BCrypt hash prefix ($ or $)
    }

    [Fact]
    public void VerifyPassword_CorrectPassword_ShouldReturnTrue()
    {
        // Arrange
        var password = "MySecretPassword2026!";
        var hash = _hasher.HashPassword(password);

        // Act
        var isValid = _hasher.VerifyPassword(password, hash);

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ShouldReturnFalse()
    {
        // Arrange
        var password = "CorrectPassword";
        var wrongPassword = "WrongPassword";
        var hash = _hasher.HashPassword(password);

        // Act
        var isValid = _hasher.VerifyPassword(wrongPassword, hash);

        // Assert
        Assert.False(isValid);
    }
}
