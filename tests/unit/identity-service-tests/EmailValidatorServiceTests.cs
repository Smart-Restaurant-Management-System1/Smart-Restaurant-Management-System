using IdentityService.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityServiceTests;

public class EmailValidatorServiceTests
{
    private readonly Mock<ILogger<EmailValidatorService>> _loggerMock;
    private readonly IConfiguration _configWithDnsSkip;
    private readonly EmailValidatorService _validatorService;

    public EmailValidatorServiceTests()
    {
        _loggerMock = new Mock<ILogger<EmailValidatorService>>();

        // Configure with SkipDnsCheck=true for deterministic offline unit tests
        var configDict = new Dictionary<string, string?>
        {
            { "EmailValidation:SkipDnsCheck", "true" }
        };
        _configWithDnsSkip = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        _validatorService = new EmailValidatorService(_loggerMock.Object, _configWithDnsSkip);
    }

    [Theory]
    [InlineData("tempmail.com")]
    [InlineData("tempmail.net")]
    [InlineData("mailinator.com")]
    [InlineData("10minutemail.com")]
    [InlineData("guerrillamail.com")]
    [InlineData("sharklasers.com")]
    [InlineData("throwawaymail.com")]
    [InlineData("yopmail.com")]
    [InlineData("trashmail.com")]
    [InlineData("dispostable.com")]
    [InlineData("sub.mailinator.com")] // Subdomain check
    public void IsDisposableDomain_KnownDisposableDomains_ReturnsTrue(string domain)
    {
        var result = _validatorService.IsDisposableDomain(domain);
        Assert.True(result, $"Expected domain '{domain}' to be identified as disposable.");
    }

    [Theory]
    [InlineData("gmail.com")]
    [InlineData("yahoo.com")]
    [InlineData("outlook.com")]
    [InlineData("hotmail.com")]
    [InlineData("icloud.com")]
    [InlineData("cinnamonbistro.com")]
    public void IsDisposableDomain_LegitimateDomains_ReturnsFalse(string domain)
    {
        var result = _validatorService.IsDisposableDomain(domain);
        Assert.False(result, $"Expected legitimate domain '{domain}' not to be identified as disposable.");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task ValidateEmailDeliverabilityAsync_NullOrEmptyEmail_ThrowsInvalidOperationException(string? email)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _validatorService.ValidateEmailDeliverabilityAsync(email!));
        Assert.Contains("required", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("plainaddress")]
    [InlineData("@missingusername.com")]
    [InlineData("username@")]
    public async Task ValidateEmailDeliverabilityAsync_MalformedEmail_ThrowsInvalidOperationException(string email)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _validatorService.ValidateEmailDeliverabilityAsync(email));
        Assert.Contains("Invalid email format", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("user@nodot")]
    [InlineData("user@.leadingdot.com")]
    [InlineData("user@trailingdot.com.")]
    [InlineData("user@-leadinghyphen.com")]
    public async Task ValidateEmailDeliverabilityAsync_InvalidDomainStructure_ThrowsInvalidOperationException(string email)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _validatorService.ValidateEmailDeliverabilityAsync(email));
        Assert.Contains("invalid", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("user@company.test")]
    [InlineData("user@server.example")]
    [InlineData("user@system.invalid")]
    [InlineData("user@app.localhost")]
    [InlineData("user@myhost.local")]
    public async Task ValidateEmailDeliverabilityAsync_ReservedTestDomains_ThrowsInvalidOperationException(string email)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _validatorService.ValidateEmailDeliverabilityAsync(email));
        Assert.Contains("reserved", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("test@mailinator.com")]
    [InlineData("user@tempmail.com")]
    [InlineData("guest@10minutemail.com")]
    [InlineData("bot@guerrillamail.com")]
    [InlineData("spam@sharklasers.com")]
    public async Task ValidateEmailDeliverabilityAsync_DisposableEmail_ThrowsInvalidOperationException(string email)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _validatorService.ValidateEmailDeliverabilityAsync(email));
        Assert.Contains("disposable", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("kunchana@gmail.com")]
    [InlineData("customer.guest@outlook.com")]
    [InlineData("bistro.admin@cinnamonbistro.com")]
    public async Task ValidateEmailDeliverabilityAsync_ValidEmail_Succeeds(string email)
    {
        // Should execute without throwing any exception
        await _validatorService.ValidateEmailDeliverabilityAsync(email);
    }
}

