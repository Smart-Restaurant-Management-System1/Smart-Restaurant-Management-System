param(
    [string]$JMeter = 'C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat'
)

$ErrorActionPreference = 'Stop'

# Ensure running from repository root
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../..')) {
    Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$resultsDir = 'QA_Evidence\Sprint2\JMeter\Results'
$jtlPath = Join-Path $resultsDir 'JMETER_SR62_002.jtl'
$planPath = 'tests\jmeter\JMETER_SR62_002_AvailabilityLoad.jmx'
$propsPath = 'tests\jmeter\smoke-results.properties'

if (-not (Test-Path $resultsDir)) {
    $null = New-Item -ItemType Directory -Force -Path $resultsDir
}

if (Test-Path $jtlPath) {
    Remove-Item -Force $jtlPath
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR62_002 (Reservation Availability Load Test)" -ForegroundColor Cyan
Write-Host ("Timestamp: " + [DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss') + " UTC")
Write-Host "============================================================"

if (-not (Test-Path $JMeter)) {
    Write-Error "SETUP ERROR: JMeter executable not found at '$JMeter'."
    exit 1
}

# 1. Register disposable Customer
$email = "jmeter.qa." + [Guid]::NewGuid().ToString('N').Substring(0, 12) + "@example.test"
$bytes = New-Object byte[] 18
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$password = "Qa9!" + [Convert]::ToBase64String($bytes)

$regBody = @{
    fullName    = 'JMeter QA Customer'
    email       = $email
    password    = $password
    phoneNumber = '0771234567'
    role        = 'Customer'
} | ConvertTo-Json

Write-Host "[SETUP] Registering disposable QA Customer ($email)..."
$null = Invoke-RestMethod -Uri 'http://localhost:5001/api/auth/register' -Method Post -ContentType 'application/json' -Body $regBody -TimeoutSec 15
Write-Host "[SETUP] Registration successful." -ForegroundColor Green

# 2. Authenticate to obtain token (masked, never printed)
$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri 'http://localhost:5001/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -TimeoutSec 15
if (-not $auth.token) {
    Write-Error "SETUP ERROR: Login succeeded but no JWT token was returned."
    exit 1
}
$qaToken = $auth.token
$headers = @{ Authorization = "Bearer $qaToken" }
Write-Host "[SETUP] Authentication successful. Bearer token acquired." -ForegroundColor Green

# 3. Choose a safe future reservation date
$visitDate = (Get-Date).AddDays(45).ToString('yyyy-MM-dd')
Write-Host "[PARAM] Target Date: $visitDate, Time: 18:00, Duration: 60m, Guests: 2"

# 4. Verify precondition: ensure availability endpoint responds
try {
    $precheck = Invoke-RestMethod -Uri "http://localhost:5000/api/Reservations/availability?date=$visitDate&startTime=18%3A00&durationMinutes=60&guestCount=2" -Headers $headers -TimeoutSec 15
    Write-Host "[SETUP] Endpoint pre-check passed. Available tables found: $(@($precheck).Count)" -ForegroundColor Green
} catch {
    Write-Error "SETUP ERROR: Pre-check failed on availability endpoint: $($_.Exception.Message)"
    exit 1
}

# 5. Set environment variables for JMeter execution
$env:JMETER_QA_TOKEN = $qaToken
$env:JMETER_QA_DATE = $visitDate

# 6. Execute JMeter (10 threads, 5s ramp-up, 5 iterations = 50 total requests)
Write-Host "[EXEC] Launching JMeter (10 threads, 5s ramp-up, 5 loops = 50 requests)..." -ForegroundColor Yellow
$jmeterArgs = @(
    '-n',
    '-t', $planPath,
    '-q', $propsPath,
    '-l', $jtlPath
)

& $JMeter @jmeterArgs
$exitCode = $LASTEXITCODE

# 7. Clear sensitive variables from environment and memory
$env:JMETER_QA_TOKEN = $null
$env:JMETER_QA_DATE = $null
$qaToken = $null
$password = $null
$auth = $null
$regBody = $null
$loginBody = $null
$headers = $null

# 8. Parse JTL and compute summary metrics
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR62_002" -ForegroundColor Cyan
Write-Host "============================================================"

if (-not (Test-Path $jtlPath)) {
    Write-Host "FAIL: JMeter did not generate result file: $jtlPath" -ForegroundColor Red
    exit 1
}

$rows = @(Import-Csv -LiteralPath $jtlPath)
if ($rows.Count -eq 0) {
    Write-Host "FAIL: JMeter generated an empty result file." -ForegroundColor Red
    exit 1
}

$http200 = @($rows | Where-Object { $_.responseCode -eq '200' }).Count
$http4xx = @($rows | Where-Object { $_.responseCode -match '^4\d\d$' }).Count
$http5xx = @($rows | Where-Object { $_.responseCode -match '^5\d\d$' }).Count

$passed = @($rows | Where-Object { $_.success -eq 'true' -and $_.responseCode -eq '200' }).Count
$failed = $rows.Count - $passed

$timings = $rows | ForEach-Object { [double]$_.elapsed } | Measure-Object -Average -Minimum -Maximum
$first = ($rows | ForEach-Object { [double]$_.timeStamp } | Measure-Object -Minimum).Minimum
$last = ($rows | ForEach-Object { [double]$_.timeStamp + [double]$_.elapsed } | Measure-Object -Maximum).Maximum
$durationSec = [Math]::Max(0.001, ($last - $first) / 1000)
$throughput = $rows.Count / $durationSec
$errorRate = (100.0 * $failed / $rows.Count)

$isPass = ($rows.Count -eq 50 -and $http200 -eq 50 -and $http5xx -eq 0 -and $failed -eq 0)

Write-Host "Threads           : 10"
Write-Host "Iterations        : 5"
Write-Host "Total Requests    : $($rows.Count)"
Write-Host "Passed Requests   : $passed" -ForegroundColor Green
$failedColor = if ($failed -gt 0) { 'Red' } else { 'Green' }
Write-Host "Failed Requests   : $failed" -ForegroundColor $failedColor
Write-Host ""
Write-Host "HTTP 200 count    : $http200" -ForegroundColor Green
$http4xxColor = if ($http4xx -gt 0) { 'Yellow' } else { 'Green' }
Write-Host "HTTP 4xx count    : $http4xx" -ForegroundColor $http4xxColor
$http5xxColor = if ($http5xx -gt 0) { 'Red' } else { 'Green' }
Write-Host "HTTP 5xx count    : $http5xx" -ForegroundColor $http5xxColor
Write-Host ""
Write-Host ("Average Latency   : {0:F2} ms" -f $timings.Average)
Write-Host ("Min Latency       : {0:F2} ms" -f $timings.Minimum)
Write-Host ("Max Latency       : {0:F2} ms" -f $timings.Maximum)
Write-Host ("Throughput        : {0:F2} requests/sec" -f $throughput)
Write-Host ("Error Rate        : {0:F2}%" -f $errorRate)
Write-Host ""

if ($isPass) {
    Write-Host "RESULT: PASS" -ForegroundColor Green
} else {
    Write-Host "RESULT: FAIL" -ForegroundColor Red
    if ($rows.Count -ne 50) {
        Write-Host "Defect: Expected 50 total requests, but received $($rows.Count)." -ForegroundColor Red
    }
    if ($http5xx -gt 0) {
        Write-Host "Defect: Encountered $http5xx HTTP 5xx server errors." -ForegroundColor Red
    }
    if ($failed -gt 0) {
        Write-Host "Defect: Encountered $failed failed requests." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Result File       : $jtlPath" -ForegroundColor Cyan
Write-Host "============================================================"

if ($isPass) { exit 0 } else { exit 1 }

