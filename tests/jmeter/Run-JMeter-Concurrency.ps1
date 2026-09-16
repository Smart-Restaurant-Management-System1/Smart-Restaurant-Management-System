param(
    [string]$JMeter = 'C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat'
)

$ErrorActionPreference = 'Stop'

# Ensure running from repository root
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../..')) {
    Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$resultsDir = 'QA_Evidence\Sprint2\JMeter\Results'
$jtlPath = Join-Path $resultsDir 'JMETER_SR62_001.jtl'
$planPath = 'tests\jmeter\JMETER_SR62_001_ConcurrentBooking.jmx'
$propsPath = 'tests\jmeter\smoke-results.properties'

if (-not (Test-Path $resultsDir)) {
    $null = New-Item -ItemType Directory -Force -Path $resultsDir
}

if (Test-Path $jtlPath) {
    Remove-Item -Force $jtlPath
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR62_001 (Same-Slot Concurrency Protection)" -ForegroundColor Cyan
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

# 3. Find clean future slot and verify availability for 2 guests
$table = $null
$chosenDate = $null
for ($attempt = 0; $attempt -lt 5; $attempt++) {
    $candDate = (Get-Date).AddDays((Get-Random -Minimum 45 -Maximum 120)).ToString('yyyy-MM-dd')
    try {
        $available = Invoke-RestMethod -Uri "http://localhost:5000/api/Reservations/availability?date=$candDate&startTime=18%3A00&durationMinutes=60&guestCount=2" -Headers $headers -TimeoutSec 15
        $candTable = @($available) | Where-Object { $_.tableId -gt 0 -and $_.seatingCapacity -ge 2 } | Select-Object -First 1
        if ($candTable) {
            $table = $candTable
            $chosenDate = $candDate
            break
        }
    } catch {}
}

if (-not $table) {
    Write-Error "SETUP ERROR: Could not find an available table for 2 guests in future slots."
    exit 1
}

Write-Host "[SETUP] Available table identified: Table ID $($table.tableId), Capacity: $($table.seatingCapacity)" -ForegroundColor Green
Write-Host "[PARAM] Slot: Date $chosenDate, Time 18:00, Duration 60m, Guests: 2"

# 4. Prepare identical booking payload and set environment variables for JMeter
$bookingObj = @{
    tableId         = [int]$table.tableId
    date            = $chosenDate
    startTime       = '18:00'
    durationMinutes = 60
    guestCount      = 2
}
$bookingBody = $bookingObj | ConvertTo-Json -Compress

$env:JMETER_QA_TOKEN = $qaToken
$env:JMETER_QA_BOOKING_BODY = $bookingBody

# 5. Launch JMeter (5 threads, ramp-up 0, 1 iteration, synchronized release)
Write-Host "[EXEC] Launching JMeter (5 concurrent threads releasing simultaneously)..." -ForegroundColor Yellow
$jmeterArgs = @(
    '-n',
    '-t', $planPath,
    '-q', $propsPath,
    '-l', $jtlPath
)

& $JMeter @jmeterArgs
$exitCode = $LASTEXITCODE

# 6. Verify customer's reservation history to ensure exactly 1 booking was committed
Write-Host "[VERIFY] Checking database commitment in customer reservation history..."
$history = Invoke-RestMethod -Uri 'http://localhost:5000/api/Reservations/my-history?page=1&pageSize=50' -Headers $headers -TimeoutSec 15
$committedCount = if ($history.totalCount -ne $null) { [int]$history.totalCount } else { @($history.items).Count }

# 7. Clear sensitive variables from environment and memory
$env:JMETER_QA_TOKEN = $null
$env:JMETER_QA_BOOKING_BODY = $null
$qaToken = $null
$password = $null
$auth = $null
$regBody = $null
$loginBody = $null
$headers = $null

# 8. Parse JTL and report results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR62_001" -ForegroundColor Cyan
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

$created = @($rows | Where-Object { $_.responseCode -eq '201' }).Count
$conflicts = @($rows | Where-Object { $_.responseCode -eq '409' }).Count
$serverErrors = @($rows | Where-Object { $_.responseCode -match '^5\d\d$' }).Count

# In this concurrency test, 1x 201 + 4x 409 are expected business outcomes
$passed = $created + $conflicts
$failed = $rows.Count - $passed

$timings = $rows | ForEach-Object { [double]$_.elapsed } | Measure-Object -Average -Minimum -Maximum
$first = ($rows | ForEach-Object { [double]$_.timeStamp } | Measure-Object -Minimum).Minimum
$last = ($rows | ForEach-Object { [double]$_.timeStamp + [double]$_.elapsed } | Measure-Object -Maximum).Maximum
$durationSec = [Math]::Max(0.001, ($last - $first) / 1000)
$throughput = $rows.Count / $durationSec

$isPass = ($rows.Count -eq 5 -and $created -eq 1 -and $conflicts -eq 4 -and $serverErrors -eq 0 -and $committedCount -eq 1)

Write-Host "Threads           : 5"
Write-Host "Iterations        : 1"
Write-Host "Total Requests    : $($rows.Count)"
Write-Host "Passed Requests   : $passed" -ForegroundColor Green
$failedColor = if ($failed -gt 0) { 'Red' } else { 'Green' }
Write-Host "Failed Requests   : $failed" -ForegroundColor $failedColor
Write-Host ""
Write-Host "HTTP 201 count    : $created" -ForegroundColor Green
Write-Host "HTTP 409 count    : $conflicts" -ForegroundColor Cyan
$serverErrorColor = if ($serverErrors -gt 0) { 'Red' } else { 'Green' }
Write-Host "HTTP 5xx count    : $serverErrors" -ForegroundColor $serverErrorColor
Write-Host ""
Write-Host ("Average Latency   : {0:F2} ms" -f $timings.Average)
Write-Host ("Min Latency       : {0:F2} ms" -f $timings.Minimum)
Write-Host ("Max Latency       : {0:F2} ms" -f $timings.Maximum)
Write-Host ("Throughput        : {0:F2} requests/sec" -f $throughput)
Write-Host ("Error Rate        : {0:F2}%" -f (100 * $failed / $rows.Count))
Write-Host ""

if ($isPass) {
    Write-Host "RESULT: PASS" -ForegroundColor Green
} else {
    Write-Host "RESULT: FAIL" -ForegroundColor Red
    if ($created -ne 1) {
        Write-Host "Defect: Expected exactly 1 HTTP 201 Created, but observed $created." -ForegroundColor Red
    }
    if ($conflicts -ne 4) {
        Write-Host "Defect: Expected exactly 4 HTTP 409 Conflict, but observed $conflicts." -ForegroundColor Red
    }
    if ($serverErrors -gt 0) {
        Write-Host "Defect: Encountered $serverErrors HTTP 5xx server errors." -ForegroundColor Red
    }
    if ($committedCount -ne 1) {
        Write-Host "Defect: Committed reservations in database count ($committedCount) is not 1." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Result File       : $jtlPath" -ForegroundColor Cyan
Write-Host "============================================================"

if ($isPass) { exit 0 } else { exit 1 }
