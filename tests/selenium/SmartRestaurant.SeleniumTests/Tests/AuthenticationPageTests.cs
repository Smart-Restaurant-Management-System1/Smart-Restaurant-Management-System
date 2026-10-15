using OpenQA.Selenium;
using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class AuthenticationPageTests : SeleniumTestBase
{
    [Fact]
    public void LoginPage_RendersAccessibleCredentialsForm()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");

        Assert.True(Wait.Until(driver => driver.FindElement(By.Id("loginEmail"))).Displayed);
        Assert.True(Driver.FindElement(By.Id("loginPassword")).Displayed);
        Assert.True(Driver.FindElement(By.CssSelector("button[type='submit']")).Displayed);
        Assert.NotEmpty(Driver.FindElements(By.XPath("//button[contains(., 'Sign up')]")));
    }

    [Fact]
    public void LoginPage_EmptySubmitShowsClientValidation()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Driver.FindElement(By.CssSelector("button[type='submit']")).Click();

        Wait.Until(driver => driver.FindElements(By.CssSelector(".error-text")).Count >= 2);
        var messages = Driver.FindElements(By.CssSelector(".error-text")).Select(element => element.Text).ToList();
        Assert.Contains("Email address is required", messages);
        Assert.Contains("Password is required", messages);
    }

    [Fact]
    public void RegistrationPage_EmptySubmitShowsClientValidation()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/register");
        Driver.FindElement(By.CssSelector("button[type='submit']")).Click();

        Wait.Until(driver => driver.FindElements(By.CssSelector(".error-text")).Count >= 4);
        var messages = Driver.FindElements(By.CssSelector(".error-text")).Select(element => element.Text).ToList();
        Assert.Contains("Full Name is required", messages);
        Assert.Contains("Email address is required", messages);
        Assert.Contains("Password is required", messages);
        Assert.Contains("Confirm Password is required", messages);
    }
}
