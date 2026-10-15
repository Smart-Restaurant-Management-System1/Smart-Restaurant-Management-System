$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$evidence = Join-Path (Get-Location).Path 'QA_Evidence/Sprint2/Selenium'
$null = New-Item -ItemType Directory -Force -Path "$evidence/Logs", "$evidence/Screenshots"
$log = "$evidence/Logs/S2_Selenium_Regression_Baseline.log"
$html = "$evidence/S2_Selenium_Terminal_Execution_Report.html"
if (!(Test-Path $html)) {
    Set-Content -LiteralPath $html -Encoding UTF8 -Value '<!doctype html><html lang="en"><meta charset="utf-8"><title>Selenium terminal execution</title><style>body{background:#111;color:#ddd;font:14px monospace}pre{margin:0;white-space:pre-wrap}.cmd{color:#64d8ee}.ok{color:#71d98b}.bad{color:#ff7070}.warn{color:#ffb454}</style>'
}
function Write-Evidence([string]$line) {
    Write-Host $line
    Add-Content -LiteralPath $log -Value $line -Encoding UTF8
    $class = if ($line -match '^>') { 'cmd' } elseif ($line -match '(?i)\b(fail|failed|error)\b') { 'bad' } elseif ($line -match '(?i)\b(skipped|skip|warning|warn)\b') { 'warn' } elseif ($line -match '(?i)\b(pass|passed|successful|success)\b') { 'ok' } else { '' }
    Add-Content -LiteralPath $html -Encoding UTF8 -Value ('<pre class="' + $class + '">' + [System.Net.WebUtility]::HtmlEncode($line) + '</pre>')
}
$env:FRONTEND_URL = 'http://localhost'
$env:SELENIUM_HEADLESS = 'false'
$env:SELENIUM_CHROME_BINARY = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$chromeVersion = (Get-Item -LiteralPath $env:SELENIUM_CHROME_BINARY).VersionInfo.FileVersion
$env:SELENIUM_CHROMEDRIVER_DIRECTORY = Join-Path $env:USERPROFILE ".cache/selenium/chromedriver/win64/$chromeVersion"
Write-Evidence ('> # Baseline execution ' + [DateTime]::UtcNow.ToString('o'))
try {
    $response = Invoke-WebRequest $env:FRONTEND_URL -UseBasicParsing -TimeoutSec 15
    Write-Evidence ("Frontend: $env:FRONTEND_URL HTTP " + $response.StatusCode)
    if (!(Test-Path (Join-Path $env:SELENIUM_CHROMEDRIVER_DIRECTORY 'chromedriver.exe'))) { throw 'Matching cached ChromeDriver not found.' }
    Write-Evidence "Chrome/ChromeDriver version: $chromeVersion; SELENIUM_HEADLESS=false"
} catch {
    Write-Evidence ('BLOCKED: Environment preflight failed: ' + $_.Exception.Message)
    exit 1
}
Write-Evidence '> dotnet test .\tests\selenium\SmartRestaurant.SeleniumTests\SmartRestaurant.SeleniumTests.csproj --logger "console;verbosity=normal"'
$ErrorActionPreference = 'Continue'
dotnet test .\tests\selenium\SmartRestaurant.SeleniumTests\SmartRestaurant.SeleniumTests.csproj --logger "console;verbosity=normal" 2>&1 | ForEach-Object { Write-Evidence $_.ToString() }
$testExitCode = $LASTEXITCODE
exit $testExitCode
