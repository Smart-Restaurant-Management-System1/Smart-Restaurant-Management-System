using OpenQA.Selenium;
using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class LandingPageTests : SeleniumTestBase
{
    [Fact]
    public void LandingPage_IsPublicAndProvidesLoginNavigation()
    {
        Driver.Navigate().GoToUrl(SeleniumSettings.FrontendUrl);

        var hero = Wait.Until(driver => driver.FindElement(By.Id("hero-title")));
        var login = Driver.FindElement(By.CssSelector("a.bistro-login-button[href='/login']"));

        Assert.Contains("A place to gather.", hero.Text);
        Assert.Contains("A moment to savour.", hero.Text);
        Assert.True(login.Displayed);
    }
}
