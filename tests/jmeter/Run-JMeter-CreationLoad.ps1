param(
    [string]$JMeter = 'C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat'
)

$ErrorActionPreference = 'Stop'

# Ensure running from repository root
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../..')) {
    Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$resultsDir = 'QA_Evidence\Sprint2\JMeter\Results'
$jtlPath = Join-Path $resultsDir 'JMETER_SR58_001.jtl'
$planPath = 'tests\jmeter\JMETER_SR58_001_ReservationCreationLoad.jmx'
$propsPath = 'tests\jmeter\smoke-results.properties'

if (-not (Test-Path $resultsDir)) {
    $null = New-Item -ItemType Directory -Force -Path $resultsDir
}

if (Test-Path $jtlPath) {
    Remove-Item -Force $jtlPath
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR58_001 (Reservation Creation Moderate Load)" -ForegroundColor Cyan
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

# 3. Retrieve suitable active restaurant tables
$activeTables = @()
try {
    $rawTables = Invoke-RestMethod -Uri 'http://localhost:5000/api/Tables/active' -Headers $headers -TimeoutSec 15
    $activeTables = @($rawTables | Where-Object { $_.seatingCapacity -ge 2 -or $_.capacity -ge 2 })
} catch {}

if ($activeTables.Count -eq 0) {
    try {
        $rawTables = Invoke-RestMethod -Uri 'http://localhost:5000/api/Tables' -Headers $headers -TimeoutSec 15
        $activeTables = @($rawTables | Where-Object { $_.seatingCapacity -ge 2 -or $_.capacity -ge 2 })
    } catch {}
}

$tableIds = @($activeTables | ForEach-Object {
    if ($_.tableId) { [int]$_.tableId } elseif ($_.id) { [int]$_.id } else { 1 }
})

if ($tableIds.Count -eq 0) {
    $tableIds = @(1)
}

$tableIdsStr = ($tableIds -join ',')
Write-Host "[SETUP] Suitable active tables retrieved: Table ID(s) $tableIdsStr" -ForegroundColor Green

# 4. Configure clean future base date offset (200-350 days out to guarantee non-conflict)
$baseOffset = Get-Random -Minimum 200 -Maximum 350
$sampleDate1 = (Get-Date).AddDays($baseOffset + 1).ToString('yyyy-MM-dd')
$sampleDate10 = (Get-Date).AddDays($baseOffset + 10).ToString('yyyy-MM-dd')
Write-Host "[PARAM] 10 unique non-conflicting slots generated across calendar dates: $sampleDate1 to $sampleDate10 (Time: 18:00, Duration: 60m, Guests: 2)"

# 5. Set environment variables for JMeter execution
$env:JMETER_QA_TOKEN = $qaToken
$env:JMETER_QA_TABLE_IDS = $tableIdsStr
$env:JMETER_QA_BASE_OFFSET = $baseOffset.ToString()

# 6. Execute JMeter (5 threads, 5s ramp-up, 2 iterations = 10 unique creation requests)
Write-Host "[EXEC] Launching JMeter (5 threads, 5s ramp-up, 2 loops = 10 creation requests)..." -ForegroundColor Yellow
$jmeterArgs = @(
    '-n',
    '-t', $planPath,
    '-q', $propsPath,
    '-l', $jtlPath
)

& $JMeter @jmeterArgs
$exitCode = $LASTEXITCODE

# 7. Check database history post-execution
$committedCount = 0
try {
    $history = Invoke-RestMethod -Uri 'http://localhost:5000/api/Reservations/my-history?page=1&pageSize=50' -Headers $headers -TimeoutSec 15
    $committedCount = if ($history.totalCount -ne $null) { [int]$history.totalCount } else { @($history.items).Count }
} catch {}

# 8. Clear sensitive variables from environment and memory
$env:JMETER_QA_TOKEN = $null
$env:JMETER_QA_TABLE_IDS = $null
$env:JMETER_QA_BASE_OFFSET = $null
$qaToken = $null
$password = $null
$auth = $null
$regBody = $null
$loginBody = $null
$headers = $null

# 9. Parse JTL and report results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: JMETER_SR58_001" -ForegroundColor Cyan
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

$http201 = @($rows | Where-Object { $_.responseCode -eq '201' }).Count
$http4xx = @($rows | Where-Object { $_.responseCode -match '^4\d\d$' }).Count
$http5xx = @($rows | Where-Object { $_.responseCode -match '^5\d\d$' }).Count

$passed = @($rows | Where-Object { $_.success -eq 'true' -and $_.responseCode -eq '201' }).Count
$failed = $rows.Count - $passed

$timings = $rows | ForEach-Object { [double]$_.elapsed } | Measure-Object -Average -Minimum -Maximum
$first = ($rows | ForEach-Object { [double]$_.timeStamp } | Measure-Object -Minimum).Minimum
$last = ($rows | ForEach-Object { [double]$_.timeStamp + [double]$_.elapsed } | Measure-Object -Maximum).Maximum
$durationSec = [Math]::Max(0.001, ($last - $first) / 1000)
$throughput = $rows.Count / $durationSec
$errorRate = (100.0 * $failed / $rows.Count)

$isPass = ($rows.Count -eq 10 -and $http201 -eq 10 -and $http4xx -eq 0 -and $http5xx -eq 0 -and $failed -eq 0)

Write-Host "Threads           : 5"
Write-Host "Iterations        : 2"
Write-Host "Total Requests    : $($rows.Count)"
Write-Host "Passed Requests   : $passed" -ForegroundColor Green
$failedColor = if ($failed -gt 0) { 'Red' } else { 'Green' }
Write-Host "Failed Requests   : $failed" -ForegroundColor $failedColor
Write-Host ""
Write-Host "HTTP 201 count    : $http201" -ForegroundColor Green
$http4xxColor = if ($http4xx -gt 0) { 'Red' } else { 'Green' }
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
    if ($rows.Count -ne 10) {
        Write-Host "Defect: Expected 10 total requests, but received $($rows.Count)." -ForegroundColor Red
    }
    if ($http201 -ne 10) {
        Write-Host "Defect: Expected 10 HTTP 201 Created responses, but received $http201." -ForegroundColor Red
    }
    if ($http4xx -gt 0) {
        Write-Host "Defect: Encountered $http4xx HTTP 4xx client/conflict errors." -ForegroundColor Red
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

