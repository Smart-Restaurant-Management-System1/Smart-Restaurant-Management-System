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

        var driver = new ChromeDriver(options);
        driver.Manage().Timeouts().ImplicitWait = TimeSpan.Zero;
        return driver;
    }
}
