param(
    [string]$JMeter = 'C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat'
)

$ErrorActionPreference = 'Stop'

# Ensure running from repository root
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../..')) {
    Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$resultsDir = 'QA_Evidence\Sprint2\JMeter\Results'
$jtlPath = Join-Path $resultsDir 'JMETER_AUTH_001.jtl'
$planPath = 'tests\jmeter\JMETER_AUTH_001_UnauthorizedRequest.jmx'
$propsPath = 'tests\jmeter\smoke-results.properties'

if (-not (Test-Path $resultsDir)) {
    $null = New-Item -ItemType Directory -Force -Path $resultsDir
}

if (Test-Path $jtlPath) {
    Remove-Item -Force $jtlPath
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_AUTH_001 (Unauthorized Protected Reservation)" -ForegroundColor Cyan
Write-Host ("Timestamp: " + [DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss') + " UTC")
Write-Host "============================================================"

if (-not (Test-Path $JMeter)) {
    Write-Error "SETUP ERROR: JMeter executable not found at '$JMeter'."
    exit 1
}

Write-Host "[SECURITY] Requesting GET /api/Reservations/my-history with NO Authorization header..." -ForegroundColor Yellow

# 1. Execute JMeter in non-GUI mode (1 thread, 1s ramp-up, 1 iteration)
$jmeterArgs = @(
    '-n',
    '-t', $planPath,
    '-q', $propsPath,
    '-l', $jtlPath
)

& $JMeter @jmeterArgs
$exitCode = $LASTEXITCODE

# 2. Parse JTL and report results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_AUTH_001" -ForegroundColor Cyan
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

$http401 = @($rows | Where-Object { $_.responseCode -eq '401' }).Count
$http5xx = @($rows | Where-Object { $_.responseCode -match '^5\d\d$' }).Count

# In this security test, HTTP 401 is the expected functional outcome
$passed = $http401
$failed = $rows.Count - $passed

$timings = $rows | ForEach-Object { [double]$_.elapsed } | Measure-Object -Average -Minimum -Maximum
$first = ($rows | ForEach-Object { [double]$_.timeStamp } | Measure-Object -Minimum).Minimum
$last = ($rows | ForEach-Object { [double]$_.timeStamp + [double]$_.elapsed } | Measure-Object -Maximum).Maximum
$durationSec = [Math]::Max(0.001, ($last - $first) / 1000)
$throughput = $rows.Count / $durationSec
$errorRate = (100.0 * $failed / $rows.Count)

$isPass = ($rows.Count -eq 1 -and $http401 -eq 1 -and $http5xx -eq 0 -and $failed -eq 0)

Write-Host "Threads           : 1"
Write-Host "Iterations        : 1"
Write-Host "Total Requests    : $($rows.Count)"
Write-Host "Passed Requests   : $passed" -ForegroundColor Green
$failedColor = if ($failed -gt 0) { 'Red' } else { 'Green' }
Write-Host "Failed Requests   : $failed" -ForegroundColor $failedColor
Write-Host ""
Write-Host "HTTP 401 count    : $http401" -ForegroundColor Green
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
    if ($http401 -ne 1) {
        Write-Host "Defect: Protected endpoint did not return HTTP 401 Unauthorized." -ForegroundColor Red
    }
    if ($http5xx -gt 0) {
        Write-Host "Defect: Encountered $http5xx HTTP 5xx server errors." -ForegroundColor Red
    }
    if ($failed -gt 0) {
        $rows | Where-Object { $_.success -ne 'true' } | ForEach-Object {
            Write-Host "Assertion Failure : $($_.failureMessage)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Result File       : $jtlPath" -ForegroundColor Cyan
Write-Host "============================================================"

if ($isPass) { exit 0 } else { exit 1 }

