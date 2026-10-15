using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using ReservationService.Controllers;
using ReservationService.Models;
using Xunit;

namespace ReservationServiceTests;

// The order cart is a Customer-only API (SR-132 / SR-157). Admin and KitchenStaff get 403 by design, so the frontend must
// never route them into cart-backed pages. These tests pin the backend access matrix so it is not broadened by accident.
public sealed class OrderCartAuthorizationTests
{
    private static ClaimsPrincipal Principal(string? role)
    {
        if (role is null)
        {
            return new ClaimsPrincipal(new ClaimsIdentity());   // unauthenticated
        }

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "1"), new Claim(ClaimTypes.Role, role) },
            authenticationType: "Test",
            nameType: ClaimTypes.NameIdentifier,
            roleType: ClaimTypes.Role);
        return new ClaimsPrincipal(identity);
    }

    private static async Task<bool> IsAllowedAsync(string? role)
    {
        var authorizeData = typeof(OrderCartController).GetCustomAttributes<AuthorizeAttribute>().ToList();
        Assert.NotEmpty(authorizeData);

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization();
        using var provider = services.BuildServiceProvider();

        var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();
        var policy = await AuthorizationPolicy.CombineAsync(policyProvider, authorizeData);
        Assert.NotNull(policy);

        var result = await provider.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(Principal(role), null, policy!);
        return result.Succeeded;
    }

    [Fact]
    public async Task Customer_IsAllowed() => Assert.True(await IsAllowedAsync(AppRoles.Customer));

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.KitchenStaff)]
    [InlineData("SomeUnknownRole")]
    public async Task NonCustomerRoles_AreForbidden(string role) => Assert.False(await IsAllowedAsync(role));

    [Fact]
    public async Task Unauthenticated_IsRejected() => Assert.False(await IsAllowedAsync(null));

    [Fact]
    public void Controller_IsNotAnonymous_AndNoActionOverridesAuthorization()
    {
        Assert.Equal(AppRoles.Customer, typeof(OrderCartController).GetCustomAttribute<AuthorizeAttribute>()!.Roles);

        foreach (var method in typeof(OrderCartController).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
        {
            Assert.Null(method.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.Null(method.GetCustomAttribute<AuthorizeAttribute>());
        }
    }
}
