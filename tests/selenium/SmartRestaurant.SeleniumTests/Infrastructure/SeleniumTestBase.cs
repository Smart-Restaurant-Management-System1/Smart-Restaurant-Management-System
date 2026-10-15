using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace SmartRestaurant.SeleniumTests.Infrastructure;

public abstract class SeleniumTestBase : IDisposable
{
    protected IWebDriver Driver { get; } = ChromeDriverFactory.Create();

    protected WebDriverWait Wait => new(Driver, TimeSpan.FromSeconds(10));

    public void Dispose()
    {
        Driver.Quit();
        Driver.Dispose();
    }
}
