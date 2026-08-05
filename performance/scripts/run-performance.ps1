@echo off
REM SmartSoko Performance Testing - Windows PowerShell Runner
REM Usage: .\run-performance.ps1 [test-type] [options]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'auth', 'product', 'search', 'cart', 'checkout', 'payment', 'merchant', 'order', 'soak', 'spike', 'datagen')]
    [string]$TestType = 'all',

    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = 'http://localhost:3000',

    [Parameter(Mandatory=$false)]
    [string]$FirebaseApiKey = 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE',

    [Parameter(Mandatory=$false)]
    [string]$PesapalEnv = 'sandbox',

    [Parameter(Mandatory=$false)]
    [switch]$GenerateData = $false,

    [Parameter(Mandatory=$false)]
    [int]$Users = 1000000,

    [Parameter(Mandatory=$false)]
    [int]$Products = 500000,

    [Parameter(Mandatory=$false)]
    [int]$Orders = 5000000
)

# Colors for output
$GREEN = "\033[32m"
$RED = "\033[31m"
$YELLOW = "\033[33m"
$CYAN = "\033[36m"
$RESET = "\033[0m"

function Write-Header {
    param([string]$Message)
    Write-Host "`n$CYAN===========================================$RESET"
    Write-Host "$CYAN  $Message$RESET"
    Write-Host "$CYAN===========================================$RESET`n"
}

function Write-Success {
    param([string]$Message)
    Write-Host "$GREEN✓ $Message$RESET"
}

function Write-Error {
    param([string]$Message)
    Write-Host "$RED✗ $Message$RESET"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$YELLOW⚠ $Message$RESET"
}

function Check-Docker {
    Write-Header "Checking Docker"
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker not found. Please install Docker Desktop."
        exit 1
    }
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose not found."
        exit 1
    }
    Write-Success "Docker and Docker Compose found"
}

function Check-Environment {
    Write-Header "Checking Environment Variables"
    $requiredVars = @('FIREBASE_SERVICE_ACCOUNT_BASE64')
    $missing = @()
    
    foreach ($var in $requiredVars) {
        if (-not [Environment]::GetEnvironmentVariable($var)) {
            $missing += $var
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Warning "Missing environment variables: $($missing -join ', ')"
        Write-Warning "Some tests may not work without Firebase credentials"
    } else {
        Write-Success "All required environment variables set"
    }
}

function Start-Infrastructure {
    Write-Header "Starting Infrastructure"
    
    $composeFile = "docker-compose.yml"
    if (-not (Test-Path $composeFile)) {
        Write-Error "docker-compose.yml not found in current directory"
        exit 1
    }
    
    Write-Host "Starting Prometheus, Grafana, Redis, InfluxDB..."
    docker-compose up -d prometheus grafana redis influxdb telegraf
    
    Write-Host "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    # Check Prometheus
    $prometheusReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:9090/-/ready" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $prometheusReady = $true
                break
            }
        } catch {}
        Start-Sleep -Seconds 2
    }
    
    if ($prometheusReady) {
        Write-Success "Prometheus ready at http://localhost:9090"
    } else {
        Write-Warning "Prometheus may not be fully ready"
    }
    
    # Check Grafana
    $grafanaReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $grafanaReady = $true
                break
            }
        } catch {}
        Start-Sleep -Seconds 2
    }
    
    if ($grafanaReady) {
        Write-Success "Grafana ready at http://localhost:3001 (admin/admin)"
    } else {
        Write-Warning "Grafana may not be fully ready"
    }
}

function Start-SmartsokoApp {
    Write-Header "Starting SmartSoko Application"
    
    docker-compose up -d smartsoko-app
    
    Write-Host "Waiting for SmartSoko app to be ready..."
    $appReady = $false
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "$BaseUrl/health" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $appReady = $true
                break
            }
        } catch {}
        Start-Sleep -Seconds 3
    }
    
    if ($appReady) {
        Write-Success "SmartSoko app ready at $BaseUrl"
    } else {
        Write-Error "SmartSoko app failed to start"
        exit 1
    }
}

function Run-DataGeneration {
    Write-Header "Generating Test Data"
    
    docker-compose run --rm datagen node /datagen/generate-all.js `
        --users $Users `
        --products $Products `
        --orders $Orders
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Test data generation complete"
    } else {
        Write-Error "Test data generation failed"
        exit 1
    }
}

function Run-K6Test {
    param(
        [string]$TestName,
        [string]$ScriptPath,
        [hashtable]$EnvVars = @{}
    )
    
    Write-Header "Running $TestName Test"
    
    $envVars = @{
        'BASE_URL' = $BaseUrl
        'FIREBASE_API_KEY' = $FirebaseApiKey
        'PESAPAL_ENV' = $PesapalEnv
    } + $EnvVars
    
    $envArgs = $envVars.GetEnumerator() | ForEach-Object { "-e `"$($_.Key)=$($_.Value)`"" } | Join-String -Separator " "
    
    $cmd = "docker-compose run --rm k6 run $ScriptPath $envArgs"
    Write-Host "Executing: $cmd"
    
    $result = Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "$TestName test completed successfully"
    } else {
        Write-Error "$TestName test failed with exit code $LASTEXITCODE"
        return $false
    }
    
    return $true
}

function Run-AllTests {
    Write-Header "Running All Performance Tests"
    
    $results = @{}
    
    $tests = @(
        @{ Name = 'Auth'; Script = '/scripts/auth-test.js' },
        @{ Name = 'Product Browse'; Script = '/scripts/product-test.js' },
        @{ Name = 'Search'; Script = '/scripts/search-test.js' },
        @{ Name = 'Cart'; Script = '/scripts/cart-test.js' },
        @{ Name = 'Checkout'; Script = '/scripts/checkout-test.js' },
        @{ Name = 'Payment'; Script = '/scripts/payment-test.js' },
        @{ Name = 'Merchant Dashboard'; Script = '/scripts/merchant-test.js' },
        @{ Name = 'Order Processing'; Script = '/scripts/order-test.js' }
    )
    
    foreach ($test in $tests) {
        $success = Run-K6Test -TestName $test.Name -ScriptPath $test.Script
        $results[$test.Name] = $success
    }
    
    Write-Header "Test Results Summary"
    foreach ($test in $results.Keys) {
        $status = if ($results[$test]) { "$GREEN PASS$RESET" } else { "$RED FAIL$RESET" }
        Write-Host "  $test: $status"
    }
    
    $failed = $results.Values | Where-Object { -not $_ } | Measure-Object | Select-Object -ExpandProperty Count
    if ($failed -gt 0) {
        Write-Error "$failed test(s) failed"
        exit 1
    }
    
    Write-Success "All tests passed!"
}

# Main execution
Write-Host "`n$CYAN╔══════════════════════════════════════════════════════════╗$RESET"
Write-Host "$CYAN║     SmartSoko Performance Testing Framework             ║$RESET"
Write-Host "$CYAN║     Test Type: $TestType$([String]::new(' ', 47 - $TestType.Length))║$RESET"
Write-Host "$CYAN╚══════════════════════════════════════════════════════════╝$RESET`n"

Check-Docker
Check-Environment

# Change to performance directory
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition)

if ($GenerateData -or $TestType -eq 'datagen') {
    Start-Infrastructure
    Start-SmartsokoApp
    Run-DataGeneration
    if ($TestType -eq 'datagen') { exit 0 }
}

Start-Infrastructure
Start-SmartsokoApp

switch ($TestType) {
    'all' { Run-AllTests }
    'auth' { Run-K6Test 'Auth' '/scripts/auth-test.js' }
    'product' { Run-K6Test 'Product Browse' '/scripts/product-test.js' }
    'search' { Run-K6Test 'Search' '/scripts/search-test.js' }
    'cart' { Run-K6Test 'Cart' '/scripts/cart-test.js' }
    'checkout' { Run-K6Test 'Checkout' '/scripts/checkout-test.js' }
    'payment' { Run-K6Test 'Payment' '/scripts/payment-test.js' }
    'merchant' { Run-K6Test 'Merchant Dashboard' '/scripts/merchant-test.js' }
    'order' { Run-K6Test 'Order Processing' '/scripts/order-test.js' }
    'soak' { 
        Run-K6Test 'Soak' '/scripts/soak-test.js' @{ 'SOAK_DURATION' = '24h' }
    }
    'spike' {
        Run-K6Test 'Spike' '/scripts/spike-test.js'
    }
}

Write-Header "Performance Testing Complete"
Write-Host "View results in:"
Write-Host "  - Grafana: http://localhost:3001 (admin/admin)"
Write-Host "  - Prometheus: http://localhost:9090"
Write-Host "  - Reports: ./reports/"
Write-Host ""