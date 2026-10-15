namespace SmartRestaurant.SeleniumTests.Infrastructure;

internal static class SeleniumSettings
{
    internal static string FrontendUrl =>
        Environment.GetEnvironmentVariable("FRONTEND_URL")?.TrimEnd('/') ?? "http://localhost:5173";

    internal static bool Headless =>
        !string.Equals(Environment.GetEnvironmentVariable("SELENIUM_HEADLESS"), "false", StringComparison.OrdinalIgnoreCase);
}
