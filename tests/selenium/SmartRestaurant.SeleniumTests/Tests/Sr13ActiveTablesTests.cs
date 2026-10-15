using OpenQA.Selenium;
using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class Sr13ActiveTablesTests : SeleniumTestBase
{
    [Fact]
    public void GuestCannotOpenActiveTablesPage()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/tables");

        Wait.Until(driver => driver.Url.Contains("/login", StringComparison.OrdinalIgnoreCase));

        Assert.Contains("/login", Driver.Url, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(Driver.FindElements(By.CssSelector("form")));
    }

    [Fact]
    public void NewlyRegisteredCustomer_CanViewReadOnlyActiveTableGrid()
    {
        var email = $"sr13.selenium.{Guid.NewGuid():N}@example.test";
        const string password = "Selenium123!";

        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/register");
        Driver.FindElement(By.Id("fullName")).SendKeys("SR13 Selenium Customer");
        Driver.FindElement(By.Id("email")).SendKeys(email);
        Driver.FindElement(By.Id("phoneNumber")).SendKeys("0771234567");
        Driver.FindElement(By.Id("password")).SendKeys(password);
        Driver.FindElement(By.Id("confirmPassword")).SendKeys(password);
        Driver.FindElement(By.CssSelector("button[type='submit']")).Click();

        Wait.Until(driver => driver.Url.Contains("/login", StringComparison.OrdinalIgnoreCase));
        Driver.FindElement(By.Id("loginEmail")).SendKeys(email);
        Driver.FindElement(By.Id("loginPassword")).SendKeys(password);
        Driver.FindElement(By.CssSelector("button[type='submit']")).Click();
        Wait.Until(driver => driver.Url.Contains("/portal", StringComparison.OrdinalIgnoreCase));
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/tables");

        var heading = Wait.Until(driver => driver.FindElement(By.CssSelector(".active-tables-header h1")));
        Wait.Until(driver =>
            driver.FindElements(By.CssSelector(".active-table-card")).Count > 0 ||
            driver.FindElements(By.CssSelector(".active-tables-error")).Count > 0);
        var errors = Driver.FindElements(By.CssSelector(".active-tables-error"));
        var cards = Driver.FindElements(By.CssSelector(".active-table-card"));

        Assert.Equal("Our tables", heading.Text);
        Assert.Empty(errors);
        Assert.NotEmpty(cards);
        Assert.All(cards, card =>
        {
            Assert.Contains("Table", card.Text);
            Assert.Contains("seat", card.Text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Inactive", card.Text, StringComparison.OrdinalIgnoreCase);
        });
        Assert.Empty(Driver.FindElements(By.XPath("//button[contains(., 'Add') or contains(., 'Edit') or contains(., 'Deactivate')]")));
    }
}
