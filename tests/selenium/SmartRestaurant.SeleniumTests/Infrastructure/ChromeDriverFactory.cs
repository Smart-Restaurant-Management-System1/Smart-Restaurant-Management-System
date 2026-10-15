using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;

namespace SmartRestaurant.SeleniumTests.Infrastructure;

internal static class ChromeDriverFactory
{
    internal static IWebDriver Create()
    {
        var options = new ChromeOptions();
        if (SeleniumSettings.Headless) options.AddArgument("--headless=new");
        options.AddArgument("--window-size=1440,1000");
        options.AddArgument("--no-sandbox");
        options.AddArgument("--disable-dev-shm-usage");

        var chromeBinary = Environment.GetEnvironmentVariable("SELENIUM_CHROME_BINARY");
        if (!string.IsNullOrWhiteSpace(chromeBinary)) options.BinaryLocation = chromeBinary;

        var driverDirectory = Environment.GetEnvironmentVariable("SELENIUM_CHROMEDRIVER_DIRECTORY");
        var driver = string.IsNullOrWhiteSpace(driverDirectory)
            ? new ChromeDriver(options)
            : new ChromeDriver(ChromeDriverService.CreateDefaultService(driverDirectory), options);
        driver.Manage().Timeouts().ImplicitWait = TimeSpan.Zero;
        return driver;
    }
}
