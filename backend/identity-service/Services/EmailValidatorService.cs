using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

/// <summary>
/// Implements domain validation, disposable email blocklisting, and DNS deliverability checks (SR-296).
/// Prevents registration with fake, bot-generated, or temporary email accounts.
/// </summary>
public class EmailValidatorService : IEmailValidatorService
{
    private readonly ILogger<EmailValidatorService> _logger;
    private readonly bool _skipDnsCheck;

    /// <summary>
    /// Static set of common disposable, temporary, and throwaway email domains.
    /// Case-insensitive for fast O(1) lookups.
    /// </summary>
    private static readonly HashSet<string> DisposableDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        // Popular throwaway email providers
        "tempmail.com", "tempmail.net", "tempmail.org", "temp-mail.org", "temp-mail.io",
        "mailinator.com", "mailinator.net", "mailinator.org",
        "10minutemail.com", "10minutemail.net", "10minmail.com",
        "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
        "sharklasers.com", "grr.la", "guerrillamail.biz", "guerrillamail.de",
        "throwawaymail.com",
        "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
        "trashmail.com", "trashmail.net", "trashmail.me", "trashmail.at", "trashmail.io",
        "dispostable.com",
        "fakeinbox.com",
        "getairmail.com",
        "mohmal.com", "mohmal.in",
        "crazymailing.com",
        "maildrop.cc",
        "inboxkitten.com",
        "nada.ltd", "getnada.com", "abovethemap.com",
        "burnermail.io",
        "mytemp.email",
        "tempr.email",
        "discard.email", "discardmail.com",
        "tempail.com",
        "fakemailgenerator.com",
        "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu",
        "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us",
        "spambox.us",
        "mailnesia.com",
        "generator.email",
        "emailfake.com",
        "emailondeck.com",
        "dropmail.me",
        "harakirimail.com",
        "mintemail.com",
        "mytrashmail.com",
        "zillamail.com",
        "safetymail.info",
        "anonymbox.com",
        "instant-mail.de",
        "temporary-email.net"
    };

    public EmailValidatorService(ILogger<EmailValidatorService> logger, IConfiguration? configuration = null)
    {
        _logger = logger;
        // Allows skipping external DNS lookup in controlled unit-test/offline environments if configured
        _skipDnsCheck = configuration?.GetValue<bool>("EmailValidation:SkipDnsCheck") ?? false;
    }

    /// <inheritdoc />
    public async Task ValidateEmailDeliverabilityAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Email address is required.");
        }

        var trimmed = email.Trim().ToLowerInvariant();
        var atIndex = trimmed.LastIndexOf('@');
        if (atIndex <= 0 || atIndex >= trimmed.Length - 1)
        {
            throw new InvalidOperationException("Invalid email format.");
        }

        var domain = trimmed[(atIndex + 1)..];

        // 1. Validate domain syntax structure
        if (!domain.Contains('.') || domain.StartsWith('.') || domain.EndsWith('.') || domain.StartsWith('-') || domain.EndsWith('-'))
        {
            throw new InvalidOperationException($"The email domain '{domain}' is invalid.");
        }

        // 2. Reject reserved test / local top-level domains
        if (domain.EndsWith(".test") || domain.EndsWith(".example") || domain.EndsWith(".invalid") ||
            domain.EndsWith(".localhost") || domain.EndsWith(".local"))
        {
            throw new InvalidOperationException($"The domain '{domain}' is reserved and cannot be used for account registration.");
        }

        // 3. Reject known disposable email providers (SR-296)
        if (IsDisposableDomain(domain))
        {
            _logger.LogWarning("Registration rejected: Disposable email provider detected for domain {Domain}", domain);
            throw new InvalidOperationException("Registration with temporary or disposable email addresses is prohibited. Please use a permanent email address.");
        }

        // 4. Verify domain deliverability via DNS check (SR-296)
        if (!_skipDnsCheck)
        {
            var isDeliverable = await IsDomainDeliverableAsync(domain);
            if (!isDeliverable)
            {
                _logger.LogWarning("Registration rejected: Domain {Domain} does not exist on DNS.", domain);
                throw new InvalidOperationException($"The email domain '{domain}' does not exist or cannot receive mail. Please verify your email address.");
            }
        }
    }

    /// <inheritdoc />
    public bool IsDisposableDomain(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain)) return false;
        var cleanDomain = domain.Trim().ToLowerInvariant();

        // Exact match
        if (DisposableDomains.Contains(cleanDomain)) return true;

        // Subdomain match (e.g., mail.mailinator.com -> mailinator.com)
        var parts = cleanDomain.Split('.');
        if (parts.Length > 2)
        {
            var rootDomain = $"{parts[^2]}.{parts[^1]}";
            if (DisposableDomains.Contains(rootDomain)) return true;
        }

        return false;
    }

    /// <inheritdoc />
    public async Task<bool> IsDomainDeliverableAsync(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain)) return false;

        try
        {
            // Protect against long-hanging DNS requests with a strict 2.5s cancellation token
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2.5));
            var addresses = await Dns.GetHostAddressesAsync(domain.Trim(), cts.Token);
            return addresses != null && addresses.Length > 0;
        }
        catch (SocketException ex) when (ex.SocketErrorCode == SocketError.HostNotFound ||
                                         ex.SocketErrorCode == SocketError.NoData ||
                                         ex.SocketErrorCode == SocketError.TryAgain)
        {
            // The domain does not resolve on internet DNS
            return false;
        }
        catch (OperationCanceledException)
        {
            // Timeout: in low-bandwidth or restricted environments, log warning and fail open gracefully
            _logger.LogWarning("DNS lookup timed out for domain {Domain}. Permitting registration gracefully.", domain);
            return true;
        }
        catch (Exception ex)
        {
            // Network or security policy exception: log and fail open to prevent blocking legitimate customers
            _logger.LogWarning(ex, "Transient error occurred while resolving DNS for domain {Domain}.", domain);
            return true;
        }
    }
}

