using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace IdentityServiceTests;

public class JwtTokenGeneratorTests
{
    private readonly Mock<IConfiguration> _configMock;
    private readonly JwtTokenGenerator _tokenGenerator;

    public JwtTokenGeneratorTests()
    {
        _configMock = new Mock<IConfiguration>();
        _configMock.Setup(c => c["Jwt:Key"]).Returns("SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!");
        _configMock.Setup(c => c["Jwt:Issuer"]).Returns("SmartRestaurant");
        _configMock.Setup(c => c["Jwt:Audience"]).Returns("SmartRestaurantUsers");
        _configMock.Setup(c => c["Jwt:ExpiryMinutes"]).Returns("60");

        _tokenGenerator = new JwtTokenGenerator(_configMock.Object);
    }

    [Fact]
    public void GenerateToken_ValidUser_ReturnsSignedTokenWithClaims()
    {
        // Arrange
        var user = new User
        {
            UserId = 123,
            FullName = "Alexander Vance",
            Email = "alexander@bistro.com"
        };
        var roles = new List<string> { "Customer" };

        // Act
        var (token, expiresAt) = _tokenGenerator.GenerateToken(user, roles);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);
        Assert.True(expiresAt > DateTime.UtcNow);

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        Assert.Equal("SmartRestaurant", jwtToken.Issuer);
        Assert.Contains("SmartRestaurantUsers", jwtToken.Audiences);

        var emailClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == ClaimTypes.Email || c.Type == JwtRegisteredClaimNames.Email);
        Assert.NotNull(emailClaim);
        Assert.Equal("alexander@bistro.com", emailClaim.Value);

        var subClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == ClaimTypes.NameIdentifier || c.Type == JwtRegisteredClaimNames.Sub);
        Assert.NotNull(subClaim);
        Assert.Equal("123", subClaim.Value);

        var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == ClaimTypes.Role);
        Assert.NotNull(roleClaim);
        Assert.Equal("Customer", roleClaim.Value);
    }

    [Fact]
    public void GenerateToken_MultipleRoles_IncludesAllRoleClaims()
    {
        // Arrange
        var user = new User
        {
            UserId = 456,
            FullName = "Manager Alice",
            Email = "alice@bistro.com"
        };
        var roles = new List<string> { "Admin", "KitchenStaff" };

        // Act
        var (token, _) = _tokenGenerator.GenerateToken(user, roles);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        var roleClaims = jwtToken.Claims.Where(c => c.Type == "role" || c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Contains("Admin", roleClaims);
        Assert.Contains("KitchenStaff", roleClaims);
    }
}
