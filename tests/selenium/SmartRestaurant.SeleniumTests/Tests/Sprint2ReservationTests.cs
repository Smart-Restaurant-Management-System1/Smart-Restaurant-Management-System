using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using OpenQA.Selenium;
using SmartRestaurant.SeleniumTests.Infrastructure;

namespace SmartRestaurant.SeleniumTests.Tests;

public class Sprint2ReservationTests : SeleniumTestBase
{
    // Derived field initialization runs before the base constructor starts Chrome.
    private readonly (string Email, string Password) customer = CreateCustomer();
    private const string CustomerName = "Sprint 2 QA Customer";

    private static (string Email, string Password) CreateCustomer()
    {
        var email = $"s2.qa.{Guid.NewGuid():N}@example.test";
        var password = "Qa9!" + Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var response = client.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/register", new
        {
            fullName = CustomerName,
            email,
            password,
            phoneNumber = "0771234567",
            role = "Customer"
        }).GetAwaiter().GetResult();
        Assert.True(response.StatusCode == HttpStatusCode.Created,
            $"QA Customer registration failed with HTTP {(int)response.StatusCode}. Check Identity API/test setup.");
        return (email, password);
    }

    private static (string Email, string Password) CreateAdmin()
    {
        var email = $"s2.qa.admin.{Guid.NewGuid():N}@example.test";
        var password = "Qa9!" + Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        var staffCode = Environment.GetEnvironmentVariable("STAFF_AUTHORIZATION_CODE") ?? "local_staff_code";
        using var response = client.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/register", new
        {
            fullName = "Sprint 2 QA Admin",
            email,
            password,
            phoneNumber = "0771234568",
            role = "Admin",
            staffAuthorizationCode = staffCode
        }).GetAwaiter().GetResult();
        if (response.StatusCode != HttpStatusCode.Created)
        {
            using var fallbackResponse = client.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/register", new
            {
                fullName = "Sprint 2 QA Admin",
                email,
                password,
                phoneNumber = "0771234568",
                role = "Admin",
                staffAuthorizationCode = "BISTRO2026"
            }).GetAwaiter().GetResult();
            Assert.True(fallbackResponse.StatusCode == HttpStatusCode.Created,
                $"QA Admin registration failed with HTTP {(int)fallbackResponse.StatusCode}. Check Identity API/test setup.");
        }
        return (email, password);
    }


    [Fact]
    public void S2_AUTH_001_ValidCustomerLogin()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();

        var loginWait = Wait;
        loginWait.Message = "Expected authenticated Customer portal after valid UI login.";
        loginWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        loginWait.Until(driver =>
        {
            Assert.False(driver.FindElements(By.CssSelector(".alert-danger, .error-text"))
                .Any(element => element.Displayed), "Login UI displayed an authentication or validation error.");
            if (new Uri(driver.Url).AbsolutePath.TrimEnd('/') != "/portal") return false;
            return driver.FindElements(By.CssSelector(".portal-container h1"))
                    .Any(element => element.Displayed && element.Text == $"Welcome, {CustomerName}")
                && driver.FindElements(By.XPath("//div[@class='portal-container']//p[strong[normalize-space()='Email:']]"))
                    .Any(element => element.Displayed && element.Text == $"Email: {customer.Email}")
                && driver.FindElements(By.XPath("//div[@class='portal-container']//p[strong[normalize-space()='Role:']]"))
                    .Any(element => element.Displayed && element.Text == "Role: Customer")
                && driver.FindElements(By.XPath("//div[@class='portal-container']//button[normalize-space()='Sign Out']"))
                    .Any(element => element.Displayed);
        });

        Assert.Equal("/portal", new Uri(Driver.Url).AbsolutePath.TrimEnd('/'));
        Assert.Empty(Driver.FindElements(By.CssSelector("#loginPassword, input[type='password']")));

        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_AUTH_Valid_Customer_Login_Passed.png"));
    }

    [Fact]
    public void S2_SR57_001_ValidAvailabilitySearch()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));

        // Reload the authenticated portal to finish login's pending delayed
        // navigation before following the customer link to another page.
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        var availabilityLinks = Driver.FindElements(By.CssSelector(".portal-container a[href='/availability']"));
        Assert.True(availabilityLinks.Any(element => element.Displayed),
            "BLOCKED: Customer availability navigation is not implemented/reachable.");
        Ready(By.CssSelector(".portal-container a[href='/availability']")).Click();
        var pageWait = Wait;
        pageWait.Message = "BLOCKED: Availability page is not implemented/reachable from the customer portal.";
        pageWait.Until(driver => new Uri(driver.Url).AbsolutePath == "/availability"
            && driver.FindElement(By.CssSelector(".availability-header h1")).Displayed);

        var visitDate = DateTime.Today.AddMonths(4).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        SetAvailabilityField("date", visitDate);
        SetAvailabilityField("startTime", "18:00");
        SetAvailabilityField("durationMinutes", "60");
        SetAvailabilityField("guestCount", "2");
        Ready(By.CssSelector(".availability-form button[type='submit']")).Click();

        const string emptyMessage = "No tables match your selected date, time, duration, and guest count. Try another time or party size.";
        var searchWait = Wait;
        searchWait.Message = "Valid availability search did not reach results or its legitimate no-results state.";
        searchWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        searchWait.Until(driver =>
        {
            Assert.False(driver.FindElements(By.CssSelector(".availability-page [role='alert'], .availability-form [aria-invalid='true']"))
                .Any(element => element.Displayed), "Valid availability inputs produced a validation or API error.");
            return driver.FindElement(By.CssSelector(".availability-form button[type='submit']")).Enabled
                && (driver.FindElements(By.CssSelector(".availability-results .active-table-card"))
                    .Any(element => element.Displayed && element.Text.Contains("Table") && element.Text.Contains("Select this table"))
                || driver.FindElements(By.CssSelector(".availability-state[role='status']"))
                    .Any(element => element.Displayed && element.Text == emptyMessage));
        });

        Assert.Equal("/availability", new Uri(Driver.Url).AbsolutePath);
        Assert.True(Driver.FindElement(By.CssSelector(".availability-page a[href='/portal']")).Displayed);
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Expected the same authenticated Customer after searching.");
        Assert.Empty(Driver.FindElements(By.CssSelector(".availability-page [role='alert'], .availability-form [aria-invalid='true'], #loginPassword")));
        Assert.Equal(visitDate, Driver.FindElement(By.Id("availability-date")).GetDomProperty("value"));
        Assert.Equal("18:00", Driver.FindElement(By.Id("availability-startTime")).GetDomProperty("value"));
        Assert.Equal("60", Driver.FindElement(By.Id("availability-durationMinutes")).GetDomProperty("value"));
        Assert.Equal("2", Driver.FindElement(By.Id("availability-guestCount")).GetDomProperty("value"));

        // Fit the search context and initial result cards into one screenshot.
        Driver.Manage().Window.Size = new System.Drawing.Size(1440, 1400);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR57_Valid_Availability_Search_Passed.png"));
    }

    [Fact]
    public void S2_SR58_001_CreateReservation()
    {
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Ready(By.CssSelector(".portal-container a[href='/availability']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/availability"
            && driver.FindElement(By.Id("availability-date")).Displayed);

        var visitDate = DateTime.Today.AddMonths(5).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        SetAvailabilityField("date", visitDate);
        SetAvailabilityField("startTime", "18:00");
        SetAvailabilityField("durationMinutes", "60");
        SetAvailabilityField("guestCount", "2");
        Ready(By.CssSelector(".availability-form button[type='submit']")).Click();
        var resultWait = Wait;
        resultWait.Message = "No available table appeared for the reservation creation precondition.";
        resultWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        resultWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            try
            {
                Assert.False(driver.FindElements(By.CssSelector(".availability-state"))
                    .Any(element => element.Displayed && element.Text.StartsWith("No tables match")),
                    "Test-data issue: no table available for the chosen future slot; reservation creation was not attempted.");
                return driver.FindElements(By.CssSelector(".availability-results .active-table-card"))
                    .Any(element => element.Displayed);
            }
            catch (StaleElementReferenceException)
            {
                return false;
            }
        });
        var card = Driver.FindElements(By.CssSelector(".availability-results .active-table-card"))
            .First(element => element.Displayed);
        var selectedTable = card.FindElement(By.TagName("h2")).Text;
        card.FindElement(By.CssSelector("button")).Click();
        var reviewWait = Wait;
        reviewWait.Message = "BLOCKED: Reservation review UI is not reachable after selecting an available table.";
        reviewWait.Until(driver => new Uri(driver.Url).AbsolutePath == "/reservations/new"
            && driver.FindElement(By.CssSelector(".reservation-review")).Displayed);
        var review = Driver.FindElement(By.CssSelector(".reservation-review"));
        Assert.StartsWith(selectedTable + " ", ReservationDetail(review, "Table"));
        Assert.Equal(visitDate, ReservationDetail(review, "Date"));
        Assert.Equal("18:00\u201319:00", ReservationDetail(review, "Time"));
        Assert.Equal("60 minutes", ReservationDetail(review, "Duration"));
        Assert.Equal("2", ReservationDetail(review, "Guests"));

        // One click only: never retry a booking whose server outcome is uncertain.
        Ready(By.CssSelector(".reservation-review button[aria-describedby='reservation-submit-status']")).Click();
        var confirmationWait = Wait;
        confirmationWait.Message = "Reservation submission did not reach server-backed confirmation.";
        confirmationWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        confirmationWait.Until(driver =>
        {
            var errors = driver.FindElements(By.CssSelector(".availability-page [role='alert']"));
            Assert.True(errors.Count == 0, "Reservation UI error: " + string.Join("; ", errors.Select(element => element.Text)));
            return new Uri(driver.Url).AbsolutePath == "/reservations/confirmation"
                && driver.FindElements(By.Id("confirmation-heading"))
                    .Any(element => element.Displayed && element.Text == "Your table is requested");
        });
        var confirmation = Driver.FindElement(By.CssSelector(".reservation-confirmation"));
        var reference = confirmation.FindElement(By.CssSelector("p strong"));
        Assert.True(reference.Displayed && !string.IsNullOrWhiteSpace(reference.Text), "Booking reference must be visible.");
        Assert.Matches(@"^#[1-9]\d*$", ReservationDetail(confirmation, "Reservation"));
        Assert.Equal(selectedTable, ReservationDetail(confirmation, "Table"));
        Assert.Equal($"{visitDate} 18:00 - {visitDate} 19:00", ReservationDetail(confirmation, "Visit"));
        Assert.Equal("2", ReservationDetail(confirmation, "Guests"));
        Assert.Contains(ReservationDetail(confirmation, "Status"), new[] { "Pending", "Confirmed" });
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.True(confirmation.FindElement(By.CssSelector("a[href='/portal']")).Displayed);
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Customer must remain authenticated after reservation creation.");

        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR58_Create_Reservation_Passed.png"));
    }

    [Fact]
    public async Task S2_SR59_001_ViewOwnReservation()
    {
        // Create the booking with this disposable customer's own token. Neither
        // credentials nor tokens are written to evidence or console output.
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var login = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());
        var visitDate = DateTime.Today.AddMonths(6).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for owned-reservation setup.");
        var tableId = tables.RootElement[0].GetProperty("tableId").GetInt32();
        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Owned-reservation setup failed with HTTP {(int)created.StatusCode}; no creation retry was attempted.");
        using var booking = System.Text.Json.JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reservation = booking.RootElement;
        var id = reservation.GetProperty("reservationId").GetInt32();
        var reference = reservation.GetProperty("bookingReference").GetString()!;
        Assert.True(id > 0 && !string.IsNullOrWhiteSpace(reference));

        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Ready(By.CssSelector(".portal-container a[href='/reservations/history']")).Click();
        var historyWait = Wait;
        historyWait.Message = "Customer history did not display the newly created owned reservation.";
        historyWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == "/reservations/history"
                && driver.FindElements(By.CssSelector(".reservation-history-card"))
                    .Any(card => card.Displayed && card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        });
        var ownedCard = Driver.FindElements(By.CssSelector(".reservation-history-card"))
            .Single(card => card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        ownedCard.FindElement(By.CssSelector($"a[href='/reservations/{id}']")).Click();
        var detailWait = Wait;
        detailWait.Message = "Owned reservation detail failed to load from customer history.";
        detailWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == $"/reservations/{id}"
                && driver.FindElements(By.CssSelector("section[aria-label='Server-confirmed reservation'] h2"))
                    .Any(element => element.Displayed && element.Text == $"Booking {reference}");
        });
        var detail = Driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
        Assert.Equal(reservation.GetProperty("tableNumber").GetString(), ReservationDetail(detail, "Table"));
        Assert.Equal(reservation.GetProperty("startDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "Start (restaurant time)"));
        Assert.Equal(reservation.GetProperty("endDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "End (restaurant time)"));
        Assert.Equal("2", ReservationDetail(detail, "Guests"));
        Assert.Equal(reservation.GetProperty("status").GetString(), ReservationDetail(detail, "Status"));
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.True(Driver.FindElement(By.CssSelector(".reservation-detail a[href='/reservations/history']")).Displayed);
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Expected the reservation owner to remain authenticated as Customer.");

        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR59_View_Own_Reservation_Passed.png"));
    }

    [Fact]
    public async Task S2_SR59_002_UpdateOwnReservation()
    {
        // Create the booking with this disposable customer's own token. Neither
        // credentials nor tokens are written to evidence or console output.
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var login = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());
        var visitDate = DateTime.Today.AddMonths(7).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for owned-reservation setup.");
        using var targetAvailability = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=20%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, targetAvailability.StatusCode);
        using var targetTables = System.Text.Json.JsonDocument.Parse(await targetAvailability.Content.ReadAsStringAsync());
        var targetIds = targetTables.RootElement.EnumerateArray().Select(table => table.GetProperty("tableId").GetInt32()).ToHashSet();
        var commonTables = tables.RootElement.EnumerateArray().Where(table => targetIds.Contains(table.GetProperty("tableId").GetInt32())).ToList();
        Assert.True(commonTables.Count > 0, "Test-data issue: no table available for both the original and target schedules.");
        var tableId = commonTables[0].GetProperty("tableId").GetInt32();
        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Owned-reservation setup failed with HTTP {(int)created.StatusCode}; no creation retry was attempted.");
        using var booking = System.Text.Json.JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reservation = booking.RootElement;
        Assert.Equal("Pending", reservation.GetProperty("status").GetString());
        var id = reservation.GetProperty("reservationId").GetInt32();
        var reference = reservation.GetProperty("bookingReference").GetString()!;
        Assert.True(id > 0 && !string.IsNullOrWhiteSpace(reference));

        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Ready(By.CssSelector(".portal-container a[href='/reservations/history']")).Click();
        var historyWait = Wait;
        historyWait.Message = "Customer history did not display the newly created owned reservation.";
        historyWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == "/reservations/history"
                && driver.FindElements(By.CssSelector(".reservation-history-card"))
                    .Any(card => card.Displayed && card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        });
        var ownedCard = Driver.FindElements(By.CssSelector(".reservation-history-card"))
            .Single(card => card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        ownedCard.FindElement(By.CssSelector($"a[href='/reservations/{id}']")).Click();
        var detailWait = Wait;
        detailWait.Message = "Owned reservation detail failed to load from customer history.";
        detailWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == $"/reservations/{id}"
                && driver.FindElements(By.CssSelector("section[aria-label='Server-confirmed reservation'] h2"))
                    .Any(element => element.Displayed && element.Text == $"Booking {reference}");
        });
        var detail = Driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
        Assert.Equal(reservation.GetProperty("tableNumber").GetString(), ReservationDetail(detail, "Table"));
        Assert.Equal(reservation.GetProperty("startDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "Start (restaurant time)"));
        Assert.Equal(reservation.GetProperty("endDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "End (restaurant time)"));
        Assert.Equal("2", ReservationDetail(detail, "Guests"));
        Assert.Equal(reservation.GetProperty("status").GetString(), ReservationDetail(detail, "Status"));
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.True(Driver.FindElement(By.CssSelector(".reservation-detail a[href='/reservations/history']")).Displayed);
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Expected the reservation owner to remain authenticated as Customer.");

        var editWait = Wait;
        editWait.Message = "BLOCKED: Edit controls are not reachable for the owned future Pending reservation.";
        editWait.Until(driver => driver.FindElement(By.CssSelector(".reservation-detail form input[name='startTime']")).Displayed);
        var timeInput = Ready(By.CssSelector(".reservation-detail form input[name='startTime']"));
        Assert.Equal("18:00", timeInput.GetDomProperty("value"));
        Assert.Equal(tableId.ToString(), Driver.FindElement(By.CssSelector(".reservation-detail select[name='tableId']")).GetDomProperty("value"));
        ((IJavaScriptExecutor)Driver).ExecuteScript(
            "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(arguments[0], '20:00'); arguments[0].dispatchEvent(new Event('input', {bubbles: true}));", timeInput);
        Wait.Until(_ => timeInput.GetDomProperty("value") == "20:00");
        Ready(By.CssSelector(".reservation-detail form button[type='submit']")).Click();
        var updateWait = Wait;
        updateWait.Message = "Valid schedule update did not reach the updated server-backed detail state.";
        updateWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        updateWait.Until(driver =>
        {
            var errors = driver.FindElements(By.CssSelector(".reservation-detail [role='alert'], .reservation-detail [aria-invalid='true']"));
            Assert.True(errors.Count == 0, "Update UI error: " + string.Join("; ", errors.Select(element => element.Text)));
            var updatedSection = driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
            return ReservationDetail(updatedSection, "Start (restaurant time)") == $"{visitDate} 20:00:00"
                && ReservationDetail(updatedSection, "End (restaurant time)") == $"{visitDate} 21:00:00"
                && driver.FindElements(By.CssSelector(".reservation-detail [role='status']"))
                    .Any(element => element.Displayed && element.Text == "Reservation updated.");
        });
        // Read back independently so optimistic UI alone cannot satisfy the test.
        using var persistedResponse = await api.GetAsync($"{reservationApi}/{id}/detail");
        Assert.Equal(HttpStatusCode.OK, persistedResponse.StatusCode);
        using var persistedDocument = System.Text.Json.JsonDocument.Parse(await persistedResponse.Content.ReadAsStringAsync());
        var persisted = persistedDocument.RootElement;
        Assert.Equal(id, persisted.GetProperty("reservationId").GetInt32());
        Assert.Equal(reference, persisted.GetProperty("bookingReference").GetString());
        Assert.Equal(tableId, persisted.GetProperty("tableId").GetInt32());
        Assert.Equal($"{visitDate}T20:00:00", persisted.GetProperty("startDateTime").GetString());
        Assert.Equal($"{visitDate}T21:00:00", persisted.GetProperty("endDateTime").GetString());
        Assert.Equal(2, persisted.GetProperty("guestCount").GetInt32());
        Assert.Equal("Pending", persisted.GetProperty("status").GetString());
        var updated = Driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
        Assert.Equal($"Booking {reference}", updated.FindElement(By.TagName("h2")).Text);
        Assert.Equal(reservation.GetProperty("tableNumber").GetString(), ReservationDetail(updated, "Table"));
        Assert.Equal("2", ReservationDetail(updated, "Guests"));
        Assert.Equal("Pending", ReservationDetail(updated, "Status"));
        Assert.DoesNotContain($"{visitDate} 18:00", updated.Text);
        Assert.DoesNotContain($"{visitDate} 19:00", updated.Text);
        Assert.Equal($"/reservations/{id}", new Uri(Driver.Url).AbsolutePath);
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], [aria-invalid='true'], #loginPassword")));
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Customer must remain authenticated after update.");

        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR59_Update_Own_Reservation_Passed.png"));
    }

    [Fact]
    public async Task S2_SR59_003_CancelOwnReservation()
    {
        // 1. Create one valid future reservation owned by that Customer using API setup
        // Neither credentials nor tokens are exposed.
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var login = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());

        var visitDate = DateTime.Today.AddMonths(8).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=19%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for owned-reservation setup.");
        var tableId = tables.RootElement[0].GetProperty("tableId").GetInt32();

        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "19:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Owned-reservation setup failed with HTTP {(int)created.StatusCode}; no creation retry was attempted.");
        using var booking = System.Text.Json.JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reservation = booking.RootElement;
        Assert.Equal("Pending", reservation.GetProperty("status").GetString());
        var id = reservation.GetProperty("reservationId").GetInt32();
        var reference = reservation.GetProperty("bookingReference").GetString()!;
        Assert.True(id > 0 && !string.IsNullOrWhiteSpace(reference));

        // 2. Login through the real React UI as the disposable Customer
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));

        // 3. Navigate to Customer reservation history
        Ready(By.CssSelector(".portal-container a[href='/reservations/history']")).Click();
        var historyWait = Wait;
        historyWait.Message = "Customer history did not display the newly created owned reservation.";
        historyWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == "/reservations/history"
                && driver.FindElements(By.CssSelector(".reservation-history-card"))
                    .Any(card => card.Displayed && card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        });

        // 4. Locate the newly created reservation and open its detail view
        var ownedCard = Driver.FindElements(By.CssSelector(".reservation-history-card"))
            .Single(card => card.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        ownedCard.FindElement(By.CssSelector($"a[href='/reservations/{id}']")).Click();
        var detailWait = Wait;
        detailWait.Message = "Owned reservation detail failed to load from customer history.";
        detailWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return new Uri(driver.Url).AbsolutePath == $"/reservations/{id}"
                && driver.FindElements(By.CssSelector("section[aria-label='Server-confirmed reservation'] h2"))
                    .Any(element => element.Displayed && element.Text == $"Booking {reference}");
        });

        var detail = Driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
        Assert.Equal(reservation.GetProperty("tableNumber").GetString(), ReservationDetail(detail, "Table"));
        Assert.Equal(reservation.GetProperty("startDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "Start (restaurant time)"));
        Assert.Equal(reservation.GetProperty("endDateTime").GetString()!.Replace('T', ' '), ReservationDetail(detail, "End (restaurant time)"));
        Assert.Equal("2", ReservationDetail(detail, "Guests"));
        Assert.Equal("Pending", ReservationDetail(detail, "Status"));
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));

        // 5. Select the Cancel Reservation action
        var cancelWait = Wait;
        cancelWait.Message = "BLOCKED: Cancel reservation button is not reachable for the owned future Pending reservation.";
        cancelWait.Until(driver => driver.FindElements(By.XPath("//div[contains(@class,'reservation-detail')]//button[normalize-space()='Cancel reservation']"))
            .Any(element => element.Displayed && element.Enabled));
        var cancelButton = Ready(By.XPath("//div[contains(@class,'reservation-detail')]//button[normalize-space()='Cancel reservation']"));
        cancelButton.Click();

        // 6. Verify confirmation modal/dialog is displayed
        var dialogWait = Wait;
        dialogWait.Message = "Cancellation confirmation dialog was not displayed.";
        dialogWait.Until(driver =>
        {
            var confirmBtn = driver.FindElements(By.XPath("//dialog//button[normalize-space()='Confirm cancellation']"));
            return confirmBtn.Any(b => b.Displayed && b.Enabled);
        });
        var dialogElement = Driver.FindElement(By.TagName("dialog"));
        Assert.Contains(reference, dialogElement.Text);

        // 7. Confirm cancellation
        Ready(By.XPath("//dialog//button[normalize-space()='Confirm cancellation']")).Click();

        // 8-10. Wait for server response, verify cancellation succeeds and status changes to Cancelled
        var postCancelWait = Wait;
        postCancelWait.Message = "Reservation cancellation did not reach the updated server-backed Cancelled state.";
        postCancelWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        postCancelWait.Until(driver =>
        {
            var errors = driver.FindElements(By.CssSelector(".reservation-detail [role='alert']"));
            Assert.True(errors.Count == 0, "Cancellation UI error: " + string.Join("; ", errors.Select(element => element.Text)));
            var updatedSection = driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
            return ReservationDetail(updatedSection, "Status") == "Cancelled"
                && driver.FindElements(By.CssSelector(".reservation-detail [role='status']"))
                    .Any(element => element.Displayed && element.Text == "Reservation cancelled.");
        });

        // 11. Verify reservation record remains visible and is not deleted
        var cancelledSection = Driver.FindElement(By.CssSelector("section[aria-label='Server-confirmed reservation']"));
        Assert.Equal($"Booking {reference}", cancelledSection.FindElement(By.TagName("h2")).Text);
        Assert.Equal(reservation.GetProperty("tableNumber").GetString(), ReservationDetail(cancelledSection, "Table"));
        Assert.Equal(reservation.GetProperty("startDateTime").GetString()!.Replace('T', ' '), ReservationDetail(cancelledSection, "Start (restaurant time)"));
        Assert.Equal(reservation.GetProperty("endDateTime").GetString()!.Replace('T', ' '), ReservationDetail(cancelledSection, "End (restaurant time)"));
        Assert.Equal("2", ReservationDetail(cancelledSection, "Guests"));
        Assert.Equal("Cancelled", ReservationDetail(cancelledSection, "Status"));

        // 12. Verify Edit/Cancel actions are disabled or no longer available (read-only notice shown)
        Assert.Empty(Driver.FindElements(By.CssSelector(".reservation-detail form.availability-form")));
        Assert.Empty(Driver.FindElements(By.XPath("//div[contains(@class,'reservation-detail')]//button[normalize-space()='Cancel reservation']")));
        Assert.Contains(Driver.FindElements(By.CssSelector(".reservation-detail p")),
            element => element.Displayed && element.Text.Contains("This booking is read-only"));

        // 13. Verify Customer remains authenticated
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Expected the reservation owner to remain authenticated as Customer.");

        // Read back from API independently to confirm persistence in the database
        using var persistedResponse = await api.GetAsync($"{reservationApi}/{id}/detail");
        Assert.Equal(HttpStatusCode.OK, persistedResponse.StatusCode);
        using var persistedDocument = System.Text.Json.JsonDocument.Parse(await persistedResponse.Content.ReadAsStringAsync());
        var persisted = persistedDocument.RootElement;
        Assert.Equal(id, persisted.GetProperty("reservationId").GetInt32());
        Assert.Equal(reference, persisted.GetProperty("bookingReference").GetString());
        Assert.Equal("Cancelled", persisted.GetProperty("status").GetString());
        Assert.False(persisted.GetProperty("canEdit").GetBoolean());
        Assert.False(persisted.GetProperty("canCancel").GetBoolean());

        // 14. Verify no unexpected errors and save screenshot
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.Equal($"/reservations/{id}", new Uri(Driver.Url).AbsolutePath);

        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR59_Cancel_Own_Reservation_Passed.png"));
    }

    [Fact]
    public async Task S2_SR60_001_CustomerHistory()
    {
        // 1. Create two valid future reservations owned by this disposable customer using API setup
        // Neither credentials nor tokens are exposed.
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var login = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());

        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";

        // Reservation 1
        var visitDate1 = DateTime.Today.AddMonths(9).AddDays(RandomNumberGenerator.GetInt32(1, 14))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        using var available1 = await api.GetAsync($"{reservationApi}/availability?date={visitDate1}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available1.StatusCode);
        using var tables1 = System.Text.Json.JsonDocument.Parse(await available1.Content.ReadAsStringAsync());
        Assert.True(tables1.RootElement.GetArrayLength() > 0, "Test-data issue: no table available for history reservation 1.");
        var tableId1 = tables1.RootElement[0].GetProperty("tableId").GetInt32();
        using var created1 = await api.PostAsJsonAsync(reservationApi,
            new { tableId = tableId1, date = visitDate1, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.Equal(HttpStatusCode.Created, created1.StatusCode);
        using var booking1 = System.Text.Json.JsonDocument.Parse(await created1.Content.ReadAsStringAsync());
        var ref1 = booking1.RootElement.GetProperty("bookingReference").GetString()!;
        var id1 = booking1.RootElement.GetProperty("reservationId").GetInt32();
        var tableNum1 = booking1.RootElement.GetProperty("tableNumber").GetString()!;

        // Reservation 2
        var visitDate2 = DateTime.Today.AddMonths(9).AddDays(RandomNumberGenerator.GetInt32(15, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        using var available2 = await api.GetAsync($"{reservationApi}/availability?date={visitDate2}&startTime=19%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available2.StatusCode);
        using var tables2 = System.Text.Json.JsonDocument.Parse(await available2.Content.ReadAsStringAsync());
        Assert.True(tables2.RootElement.GetArrayLength() > 0, "Test-data issue: no table available for history reservation 2.");
        var tableId2 = tables2.RootElement[0].GetProperty("tableId").GetInt32();
        using var created2 = await api.PostAsJsonAsync(reservationApi,
            new { tableId = tableId2, date = visitDate2, startTime = "19:00", durationMinutes = 60, guestCount = 2 });
        Assert.Equal(HttpStatusCode.Created, created2.StatusCode);
        using var booking2 = System.Text.Json.JsonDocument.Parse(await created2.Content.ReadAsStringAsync());
        var ref2 = booking2.RootElement.GetProperty("bookingReference").GetString()!;
        var id2 = booking2.RootElement.GetProperty("reservationId").GetInt32();
        var tableNum2 = booking2.RootElement.GetProperty("tableNumber").GetString()!;

        // 2. Login through the real React UI as the disposable Customer
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(customer.Email);
        Ready(By.Id("loginPassword")).SendKeys(customer.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();
        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/portal"
            && driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElement(By.CssSelector(".portal-container")).Text.Contains(customer.Email));

        // 3. Navigate to Customer reservation history
        Ready(By.CssSelector(".portal-container a[href='/reservations/history']")).Click();

        // 4. Wait for history records to load and verify owned reservations appear
        var historyWait = Wait;
        historyWait.Message = "Customer reservation history did not display the owned reservations.";
        historyWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            var cards = driver.FindElements(By.CssSelector(".reservation-history-card"));
            return new Uri(driver.Url).AbsolutePath == "/reservations/history"
                && cards.Any(card => card.Displayed && card.Text.Contains(ref1))
                && cards.Any(card => card.Displayed && card.Text.Contains(ref2));
        });

        Assert.Equal("/reservations/history", new Uri(Driver.Url).AbsolutePath);
        Assert.True(Driver.FindElement(By.CssSelector("a[href='/portal']")).Displayed);
        Assert.Equal("Your booking history", Driver.FindElement(By.CssSelector(".availability-header h1")).Text);

        // 5. Verify key information is displayed for each owned reservation
        var allCards = Driver.FindElements(By.CssSelector(".reservation-history-card"));
        // Check isolation: exactly 2 cards for this newly created customer, strictly their own
        Assert.Equal(2, allCards.Count);

        var card1 = allCards.Single(c => c.FindElement(By.CssSelector(".reservation-reference")).Text == ref1);
        Assert.Equal($"Table {tableNum1}", card1.FindElement(By.TagName("h2")).Text);
        Assert.Equal("Pending", card1.FindElement(By.CssSelector(".reservation-status")).Text);
        Assert.Equal($"{visitDate1} 18:00 - {visitDate1} 19:00", ReservationDetail(card1, "Visit"));
        Assert.Equal("2", ReservationDetail(card1, "Guests"));
        Assert.True(card1.FindElement(By.CssSelector($"a[href='/reservations/{id1}']")).Displayed);

        var card2 = allCards.Single(c => c.FindElement(By.CssSelector(".reservation-reference")).Text == ref2);
        Assert.Equal($"Table {tableNum2}", card2.FindElement(By.TagName("h2")).Text);
        Assert.Equal("Pending", card2.FindElement(By.CssSelector(".reservation-status")).Text);
        Assert.Equal($"{visitDate2} 19:00 - {visitDate2} 20:00", ReservationDetail(card2, "Visit"));
        Assert.Equal("2", ReservationDetail(card2, "Guests"));
        Assert.True(card2.FindElement(By.CssSelector($"a[href='/reservations/{id2}']")).Displayed);

        // 6. Verify no unexpected error or unauthorized state
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));

        // 7. Verify pagination controls render properly when present (page size is 10, with 2 items no pagination nav is expected)
        var paginationNavs = Driver.FindElements(By.CssSelector("nav.reservation-pagination"));
        if (paginationNavs.Count > 0)
        {
            Assert.True(paginationNavs[0].Displayed);
        }

        // 8. Verify Customer remains authenticated
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Customer') === true;",
            customer.Email), "Expected customer to remain authenticated while viewing history.");

        // 9. Save screenshot evidence
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR60_Customer_History_Passed.png"));
    }

    [Fact]
    public async Task S2_SR61_001_AdminReservationList()
    {
        // 1. Create one valid future reservation owned by customer
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var customerLogin = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, customerLogin.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await customerLogin.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());

        var visitDate = DateTime.Today.AddMonths(10).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for admin list test reservation.");
        var tableId = tables.RootElement[0].GetProperty("tableId").GetInt32();

        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Reservation creation failed with HTTP {(int)created.StatusCode}.");
        using var booking = System.Text.Json.JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reservation = booking.RootElement;
        var reference = reservation.GetProperty("bookingReference").GetString()!;
        var tableNumber = reservation.GetProperty("tableNumber").GetString()!;
        Assert.False(string.IsNullOrWhiteSpace(reference));

        // 2. Create and login as disposable Admin
        var admin = CreateAdmin();
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(admin.Email);
        Ready(By.Id("loginPassword")).SendKeys(admin.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();

        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin"
            && driver.FindElements(By.XPath("//button[normalize-space()='Manage reservations']")).Any(b => b.Displayed));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElements(By.XPath("//button[normalize-space()='Manage reservations']")).Any(b => b.Displayed));

        // 3. Navigate to Admin reservation management area
        Ready(By.XPath("//button[normalize-space()='Manage reservations']")).Click();
        var adminPageWait = Wait;
        adminPageWait.Message = "BLOCKED: Admin reservation management page did not load.";
        adminPageWait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin/reservations"
            && driver.FindElements(By.CssSelector(".availability-header h1"))
                .Any(h => h.Displayed && h.Text == "Reservation management"));

        // 4. Wait for reservation list to load and verify the target reservation is visible
        var listWait = Wait;
        listWait.Message = "Admin reservation list did not display the expected reservation.";
        listWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
                .Any(card => card.Displayed && card.Text.Contains(reference));
        });

        var card = Driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
            .Single(c => c.FindElement(By.CssSelector(".reservation-reference")).Text == reference);

        // 5. Verify key reservation information is displayed
        Assert.Equal(reference, card.FindElement(By.CssSelector(".reservation-reference")).Text);
        Assert.Equal($"Table {tableNumber}", card.FindElement(By.TagName("h2")).Text);
        Assert.Equal("Pending", card.FindElement(By.CssSelector(".reservation-status")).Text);
        var detailsParagraph = card.FindElements(By.TagName("p")).First(p => p.Text.Contains("guests"));
        Assert.Contains($"{visitDate} 18:00", detailsParagraph.Text);
        Assert.Contains($"{visitDate} 19:00", detailsParagraph.Text);
        Assert.Contains("2 guests", detailsParagraph.Text);

        // 6. Verify admin-only controls are present
        var actions = card.FindElement(By.CssSelector(".admin-reservation-actions"));
        Assert.True(actions.FindElement(By.XPath(".//button[normalize-space()='Confirm']")).Displayed);
        Assert.True(actions.FindElement(By.XPath(".//button[normalize-space()='Cancel']")).Displayed);

        // 7. Verify no unauthorized/access-denied state
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.True(Driver.FindElement(By.CssSelector("a[href='/admin']")).Displayed);

        // 8. Verify Admin remains authenticated
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Admin') === true;",
            admin.Email), "Expected Admin to remain authenticated in admin reservation list.");

        // 9. Save screenshot evidence
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR61_Admin_Reservation_List_Passed.png"));
    }

    [Fact]
    public async Task S2_SR61_002_AdminStatusUpdate()
    {
        // 1. Create one valid future reservation owned by customer with initial status Pending
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var customerLogin = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, customerLogin.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await customerLogin.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());

        var visitDate = DateTime.Today.AddMonths(11).AddDays(RandomNumberGenerator.GetInt32(1, 28))
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for admin status update test.");
        var tableId = tables.RootElement[0].GetProperty("tableId").GetInt32();

        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Reservation creation failed with HTTP {(int)created.StatusCode}.");
        using var booking = System.Text.Json.JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reservation = booking.RootElement;
        Assert.Equal("Pending", reservation.GetProperty("status").GetString());
        var id = reservation.GetProperty("reservationId").GetInt32();
        var reference = reservation.GetProperty("bookingReference").GetString()!;
        Assert.True(id > 0 && !string.IsNullOrWhiteSpace(reference));

        // 2. Create and login as disposable Admin
        var admin = CreateAdmin();
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(admin.Email);
        Ready(By.Id("loginPassword")).SendKeys(admin.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();

        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin"
            && driver.FindElements(By.XPath("//button[normalize-space()='Manage reservations']")).Any(b => b.Displayed));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElements(By.XPath("//button[normalize-space()='Manage reservations']")).Any(b => b.Displayed));

        // 3. Navigate to Admin reservation management area
        Ready(By.XPath("//button[normalize-space()='Manage reservations']")).Click();
        var adminPageWait = Wait;
        adminPageWait.Message = "BLOCKED: Admin reservation management page did not load.";
        adminPageWait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin/reservations"
            && driver.FindElements(By.CssSelector(".availability-header h1"))
                .Any(h => h.Displayed && h.Text == "Reservation management"));

        // 4. Locate the newly created Pending reservation in the list
        var listWait = Wait;
        listWait.Message = "Admin reservation list did not display the expected Pending reservation.";
        listWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
                .Any(c => c.Displayed && c.Text.Contains(reference) && c.Text.Contains("Pending"));
        });

        var card = Driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
            .Single(c => c.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        Assert.Equal("Pending", card.FindElement(By.CssSelector(".reservation-status")).Text);

        // 5-6. Click Confirm action and accept browser confirm dialog
        var confirmButton = card.FindElement(By.XPath(".//button[normalize-space()='Confirm']"));
        confirmButton.Click();

        var alert = Wait.Until(driver =>
        {
            try
            {
                return driver.SwitchTo().Alert();
            }
            catch (NoAlertPresentException)
            {
                return null;
            }
        });
        Assert.Contains(reference, alert.Text);
        Assert.Contains("Confirmed", alert.Text);
        alert.Accept();

        // 7-9. Wait for server response and verify the reservation displays Confirmed
        var updateWait = Wait;
        updateWait.Message = "Reservation status transition to Confirmed was not reflected in the admin list.";
        updateWait.IgnoreExceptionTypes(typeof(StaleElementReferenceException));
        updateWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            var updatedCard = driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
                .FirstOrDefault(c => c.FindElements(By.CssSelector(".reservation-reference")).Any(r => r.Text == reference));
            return updatedCard != null
                && updatedCard.FindElement(By.CssSelector(".reservation-status")).Text == "Confirmed";
        });

        // 10. Verify the booking reference remains unchanged
        var finalCard = Driver.FindElements(By.CssSelector(".admin-reservation-list .reservation-history-card"))
            .Single(c => c.FindElement(By.CssSelector(".reservation-reference")).Text == reference);
        Assert.Equal(reference, finalCard.FindElement(By.CssSelector(".reservation-reference")).Text);
        Assert.Equal("Confirmed", finalCard.FindElement(By.CssSelector(".reservation-status")).Text);

        // Verify updated controls for Confirmed status (Confirm button is gone, Cancel and Complete are present)
        var actions = finalCard.FindElement(By.CssSelector(".admin-reservation-actions"));
        Assert.Empty(actions.FindElements(By.XPath(".//button[normalize-space()='Confirm']")));
        Assert.True(actions.FindElement(By.XPath(".//button[normalize-space()='Cancel']")).Displayed);
        Assert.True(actions.FindElement(By.XPath(".//button[normalize-space()='Complete']")).Displayed);

        // 11. Verify Admin remains authenticated
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Admin') === true;",
            admin.Email), "Expected Admin to remain authenticated after status update.");

        // 12. Verify no unexpected errors
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));

        // 13. Save screenshot evidence
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR61_Admin_Status_Update_Passed.png"));
    }

    [Fact]
    public async Task S2_SR63_001_AdminReservationReport()
    {
        // 1. Ensure at least one reservation exists so report has meaningful data
        using var api = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        using var customerLogin = await api.PostAsJsonAsync($"{SeleniumSettings.FrontendUrl}/api/auth/login",
            new { email = customer.Email, password = customer.Password });
        Assert.Equal(HttpStatusCode.OK, customerLogin.StatusCode);
        using var identity = System.Text.Json.JsonDocument.Parse(await customerLogin.Content.ReadAsStringAsync());
        api.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", identity.RootElement.GetProperty("token").GetString());

        var visitDate = DateTime.Today.AddDays(7).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var reservationApi = $"{SeleniumSettings.FrontendUrl}/reservation-api/Reservations";
        using var available = await api.GetAsync($"{reservationApi}/availability?date={visitDate}&startTime=18%3A00&durationMinutes=60&guestCount=2");
        Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        using var tables = System.Text.Json.JsonDocument.Parse(await available.Content.ReadAsStringAsync());
        Assert.True(tables.RootElement.GetArrayLength() > 0, "Test-data issue: no available table for admin report test.");
        var tableId = tables.RootElement[0].GetProperty("tableId").GetInt32();

        using var created = await api.PostAsJsonAsync(reservationApi,
            new { tableId, date = visitDate, startTime = "18:00", durationMinutes = 60, guestCount = 2 });
        Assert.True(created.StatusCode == HttpStatusCode.Created,
            $"Reservation creation failed with HTTP {(int)created.StatusCode}.");

        // 2. Login as Admin through the real React UI
        var admin = CreateAdmin();
        Driver.Navigate().GoToUrl($"{SeleniumSettings.FrontendUrl}/login");
        Ready(By.Id("loginEmail")).SendKeys(admin.Email);
        Ready(By.Id("loginPassword")).SendKeys(admin.Password);
        Ready(By.CssSelector("form button[type='submit']")).Click();

        Wait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin"
            && driver.FindElements(By.XPath("//button[normalize-space()='Reservation reports']")).Any(b => b.Displayed));
        Driver.Navigate().Refresh();
        Wait.Until(driver => driver.FindElements(By.XPath("//button[normalize-space()='Reservation reports']")).Any(b => b.Displayed));

        // 3. Navigate to the reservation reporting/analytics area
        Ready(By.XPath("//button[normalize-space()='Reservation reports']")).Click();
        var reportPageWait = Wait;
        reportPageWait.Message = "BLOCKED: Reservation reports page is not reachable from Admin dashboard.";
        reportPageWait.Until(driver => new Uri(driver.Url).AbsolutePath == "/admin/reports/reservations"
            && driver.FindElements(By.CssSelector(".availability-header h1"))
                .Any(h => h.Displayed && h.Text == "Reservation Reports"));

        // 4. Set date range to include the created reservation and submit filter
        var dateInputs = Driver.FindElements(By.CssSelector("form.admin-reservation-filters input[type='date']"));
        Assert.True(dateInputs.Count >= 2, "Expected From and To date filter inputs.");
        var toDateInput = dateInputs[1];
        var targetToDate = DateTime.Today.AddMonths(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        ((IJavaScriptExecutor)Driver).ExecuteScript(
            "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(arguments[0], arguments[1]); arguments[0].dispatchEvent(new Event('input', {bubbles: true}));",
            toDateInput, targetToDate);
        Wait.Until(_ => toDateInput.GetDomProperty("value") == targetToDate);
        Ready(By.CssSelector("form.admin-reservation-filters button[type='submit']")).Click();

        // 5. Wait for report data to load and verify summary metrics
        var reportWait = Wait;
        reportWait.Message = "Reservation report summary metrics failed to load.";
        reportWait.Until(driver =>
        {
            Assert.Empty(driver.FindElements(By.CssSelector(".availability-page [role='alert']")));
            return driver.FindElements(By.CssSelector("section[aria-label='Report summary']")).Any(s => s.Displayed);
        });

        var summarySection = Driver.FindElement(By.CssSelector("section[aria-label='Report summary']"));
        Assert.True(summarySection.Displayed);

        // 6. Verify required report elements: bookings count, cancellation metric, table data, filters, export actions
        Assert.True(summarySection.FindElements(By.XPath(".//p[text()='Total Bookings']")).Any(p => p.Displayed));
        Assert.True(summarySection.FindElements(By.XPath(".//p[text()='Cancellation Rate']")).Any(p => p.Displayed));
        Assert.True(summarySection.FindElements(By.XPath(".//p[text()='Confirmed']")).Any(p => p.Displayed));
        Assert.True(summarySection.FindElements(By.XPath(".//p[text()='Pending']")).Any(p => p.Displayed));
        Assert.True(summarySection.FindElements(By.XPath(".//p[text()='Cancelled']")).Any(p => p.Displayed));

        // Verify table utilization/share data
        Assert.True(Driver.FindElements(By.XPath("//h2[normalize-space()='Table Reservation Share']")).Any(h => h.Displayed));

        // Verify date filtering controls and export actions
        Assert.True(Driver.FindElement(By.XPath("//button[normalize-space()='Apply Range']")).Displayed);
        Assert.True(Driver.FindElement(By.XPath("//button[normalize-space()='Reset (30 Days)']")).Displayed);
        Assert.True(Driver.FindElement(By.XPath("//button[normalize-space()='Export CSV']")).Displayed);
        Assert.True(Driver.FindElement(By.XPath("//button[normalize-space()='Export Excel']")).Displayed);

        // 7. Verify no unauthorized/access-denied state
        Assert.Empty(Driver.FindElements(By.CssSelector("[role='alert'], #loginPassword")));
        Assert.True(Driver.FindElement(By.CssSelector("a[href='/admin']")).Displayed);

        // 8. Verify Admin remains authenticated
        Assert.True((bool)((IJavaScriptExecutor)Driver).ExecuteScript(
            "const user = JSON.parse(localStorage.getItem('user') || 'null'); return !!localStorage.getItem('token') && user?.email === arguments[0] && user?.roles?.includes('Admin') === true;",
            admin.Email), "Expected Admin to remain authenticated on reports page.");

        // 9. Save screenshot evidence
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "tests", "selenium",
            "SmartRestaurant.SeleniumTests", "SmartRestaurant.SeleniumTests.csproj"))) root = root.Parent;
        Assert.NotNull(root);
        var screenshots = Path.Combine(root!.FullName, "QA_Evidence", "Sprint2", "Selenium", "Screenshots");
        Directory.CreateDirectory(screenshots);
        Driver.Manage().Window.Size = new System.Drawing.Size(1440, 1200);
        ((IJavaScriptExecutor)Driver).ExecuteScript("window.scrollTo(0, 0);");
        ((ITakesScreenshot)Driver).GetScreenshot().SaveAsFile(Path.Combine(screenshots,
            "S2_QA_Selenium_SR63_Admin_Reservation_Report_Passed.png"));
    }

    private static string ReservationDetail(IWebElement section, string label) =>
        section.FindElement(By.XPath($".//dt[normalize-space()='{label}']/following-sibling::dd[1]")).Text;

    private void SetAvailabilityField(string name, string value)
    {
        var field = Ready(By.Id($"availability-{name}"));
        // Native date/time formats depend on browser locale. Notify React using
        // the native input setter and input event, without bypassing submission.
        ((IJavaScriptExecutor)Driver).ExecuteScript(
            "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(arguments[0], arguments[1]); arguments[0].dispatchEvent(new Event('input', {bubbles: true}));",
            field, value);
        Wait.Until(_ => field.GetDomProperty("value") == value);
    }

    private IWebElement Ready(By selector) => Wait.Until(driver =>
    {
        var element = driver.FindElement(selector);
        return element.Displayed && element.Enabled ? element : null;
    })!;
}

