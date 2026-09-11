# Selenium smoke tests

This is the single supported Selenium project for the repository. It replaces the previous duplicate projects and stale page objects. Coverage includes public navigation, login and registration validation, protected routes, responsive layout, and SR-13 authenticated table-grid access.

Start the frontend at `http://localhost:5173`, then run:

```powershell
dotnet test .\tests\selenium\SmartRestaurant.SeleniumTests\SmartRestaurant.SeleniumTests.csproj --logger "console;verbosity=normal"
```

To target a different frontend URL, set `FRONTEND_URL`. Set `SELENIUM_HEADLESS=false` to watch Chrome during a test run.
