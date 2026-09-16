param(
    [string]$JMeter = 'C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat'
)

$ErrorActionPreference = 'Stop'

# Ensure running from repository root
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../..')) {
    Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$resultsDir = 'QA_Evidence\Sprint2\JMeter\Results'
$jtlPath = Join-Path $resultsDir 'JMETER_SMOKE_001.jtl'
$planPath = 'tests\jmeter\Sprint2_Reservation_Performance_Test.jmx'
$propsPath = 'tests\jmeter\smoke-results.properties'

if (-not (Test-Path $resultsDir)) {
    $null = New-Item -ItemType Directory -Force -Path $resultsDir
}

if (Test-Path $jtlPath) {
    Remove-Item -Force $jtlPath
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SMOKE_001 (Reservation Availability Smoke Test)" -ForegroundColor Cyan
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
Write-Host "[SETUP] Authentication successful. Bearer token acquired." -ForegroundColor Green

# 3. Reservation parameters
$visitDate = (Get-Date).AddDays(45).ToString('yyyy-MM-dd')
Write-Host "[PARAM] Visit Date: $visitDate, Time: 18:00, Duration: 60m, Guests: 2"

# 4. Execute JMeter in non-GUI mode
Write-Host "[EXEC] Launching Apache JMeter..." -ForegroundColor Yellow
$jmeterArgs = @(
    '-n',
    '-t', $planPath,
    '-q', $propsPath,
    '-l', $jtlPath,
    "-JqaToken=$qaToken",
    "-JvisitDate=$visitDate"
)

& $JMeter @jmeterArgs
$exitCode = $LASTEXITCODE

# 5. Clear sensitive variables from memory
$qaToken = $null
$password = $null
$auth = $null
$regBody = $null
$loginBody = $null

# 6. Parse and display results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "JMETER_SMOKE_001 EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================"

if (-not (Test-Path $jtlPath)) {
    Write-Host "FAIL: JMeter did not generate result file: $jtlPath" -ForegroundColor Red
    exit 1
}

$samples = @(Import-Csv -LiteralPath $jtlPath)
if ($samples.Count -eq 0) {
    Write-Host "FAIL: JMeter generated empty result file." -ForegroundColor Red
    exit 1
}

$passed = @($samples | Where-Object { $_.success -eq 'true' -and $_.responseCode -eq '200' }).Count
$failed = $samples.Count - $passed
$timings = $samples | ForEach-Object { [double]$_.elapsed } | Measure-Object -Average -Minimum -Maximum

Write-Host "Threads           : 1"
Write-Host "Iterations        : 1"
Write-Host "Total Requests    : $($samples.Count)"
Write-Host "Passed Requests   : $passed" -ForegroundColor Green
$failedColor = if ($failed -gt 0) { 'Red' } else { 'Green' }
Write-Host "Failed Requests   : $failed" -ForegroundColor $failedColor
$samples | Group-Object responseCode | ForEach-Object {
    Write-Host "HTTP $($_.Name)         : $($_.Count)"
}
Write-Host ("Average Latency   : {0:F2} ms" -f $timings.Average)
Write-Host ("Min Latency       : {0:F2} ms" -f $timings.Minimum)
Write-Host ("Max Latency       : {0:F2} ms" -f $timings.Maximum)
Write-Host ("Error Rate        : {0:F2}%" -f (100 * $failed / $samples.Count))

if ($exitCode -eq 0 -and $passed -eq $samples.Count) {
    Write-Host "RESULT            : PASS" -ForegroundColor Green
} else {
    Write-Host "RESULT            : FAIL" -ForegroundColor Red
    $samples | Where-Object { $_.success -ne 'true' } | ForEach-Object {
        Write-Host "Assertion Failure : $($_.failureMessage)" -ForegroundColor Red
    }
}

Write-Host "Result File       : $jtlPath" -ForegroundColor Cyan
Write-Host "============================================================"
exit $exitCode
