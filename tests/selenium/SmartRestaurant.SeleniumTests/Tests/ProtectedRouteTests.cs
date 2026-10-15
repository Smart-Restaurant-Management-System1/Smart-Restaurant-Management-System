using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class ProtectedRouteTests : SeleniumTestBase
{
    [Theory]
    [InlineData("/portal")]
    [InlineData("/profile")]
    [InlineData("/admin")]
    [InlineData("/kitchen")]
    [InlineData("/tables")]
    public void GuestIsRedirectedToLoginForProtectedRoute(string path)
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}{path}");

        Wait.Until(driver => driver.Url.Contains("/login", StringComparison.OrdinalIgnoreCase));
        Assert.Contains("/login", Driver.Url, StringComparison.OrdinalIgnoreCase);
    }
}
