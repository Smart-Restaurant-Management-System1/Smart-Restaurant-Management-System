using OpenQA.Selenium;
using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class ResponsiveLayoutTests : SeleniumTestBase
{
    [Theory]
    [InlineData(375, 844)]
    [InlineData(768, 1000)]
    [InlineData(1440, 1000)]
    public void LandingPage_HasNoHorizontalOverflow(int width, int height)
    {
        Driver.Manage().Window.Size = new System.Drawing.Size(width, height);
        Driver.Navigate().GoToUrl(SeleniumSettings.FrontendUrl);
        Wait.Until(driver => driver.FindElement(By.Id("hero-title")).Displayed);

        var hasNoOverflow = (bool)((IJavaScriptExecutor)Driver)
            .ExecuteScript("return document.documentElement.scrollWidth <= window.innerWidth;");

        Assert.True(hasNoOverflow, $"Expected no horizontal overflow at {width}px.");
    }
}
