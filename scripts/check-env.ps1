# Environment Variables Validation Script (PowerShell)
# Checks if all required environment variables are set

$ErrorActionPreference = "Stop"

Write-Host "🔍 Checking Environment Variables..." -ForegroundColor Cyan
Write-Host ""

$EnvFile = ".env.local"
$Errors = 0
$Warnings = 0

# Check if .env.local exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "❌ $EnvFile not found!" -ForegroundColor Red
    Write-Host "   Run: cp .env.example .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found $EnvFile" -ForegroundColor Green
Write-Host ""

# Load environment variables
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Required variables
Write-Host "📋 Checking required variables..." -ForegroundColor Yellow

function Check-Required {
    param($VarName)
    
    $value = [Environment]::GetEnvironmentVariable($VarName, "Process")
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "❌ $VarName is not set" -ForegroundColor Red
        $script:Errors++
    } else {
        Write-Host "✅ $VarName is set" -ForegroundColor Green
    }
}

Check-Required "NEXT_PUBLIC_DEMO_MODE"
Check-Required "NEXT_PUBLIC_CNGN_ISSUER"

Write-Host ""
Write-Host "📋 Checking payment gateway variables..." -ForegroundColor Yellow

# Payment gateway variables (warnings only)
function Check-Optional {
    param($VarName)
    
    $value = [Environment]::GetEnvironmentVariable($VarName, "Process")
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "⚠️  $VarName is not set (optional for some features)" -ForegroundColor Yellow
        $script:Warnings++
    } else {
        Write-Host "✅ $VarName is set" -ForegroundColor Green
    }
}

Check-Optional "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"
Check-Optional "PAYSTACK_SECRET_KEY"
Check-Optional "NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY"
Check-Optional "FLUTTERWAVE_SECRET_KEY"
Check-Optional "FLUTTERWAVE_ENCRYPTION_KEY"

Write-Host ""
Write-Host "📋 Checking optional variables..." -ForegroundColor Yellow
Check-Optional "NEXT_PUBLIC_BILLS_WS_URL"

Write-Host ""
Write-Host "🔐 Security checks..." -ForegroundColor Yellow

# Check DEMO_MODE in production
$demoMode = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_DEMO_MODE", "Process")
if ($demoMode -eq "true") {
    Write-Host "⚠️  DEMO_MODE is enabled - DO NOT use in production!" -ForegroundColor Yellow
    $Warnings++
} else {
    Write-Host "✅ DEMO_MODE is disabled" -ForegroundColor Green
}

# Check if using test keys
$paystackKey = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "Process")
if ($paystackKey -like "*test*") {
    Write-Host "⚠️  Using Paystack TEST keys" -ForegroundColor Yellow
    $Warnings++
}

$flutterwaveKey = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY", "Process")
if ($flutterwaveKey -like "*TEST*") {
    Write-Host "⚠️  Using Flutterwave TEST keys" -ForegroundColor Yellow
    $Warnings++
}

# Validate Stellar address format
$cngnIssuer = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_CNGN_ISSUER", "Process")
if (-not [string]::IsNullOrWhiteSpace($cngnIssuer)) {
    if ($cngnIssuer -notmatch '^G[A-Z0-9]{55}$') {
        Write-Host "❌ NEXT_PUBLIC_CNGN_ISSUER has invalid format (should be 56 chars starting with G)" -ForegroundColor Red
        $Errors++
    } else {
        Write-Host "✅ NEXT_PUBLIC_CNGN_ISSUER format is valid" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($Errors -gt 0) {
    Write-Host "❌ Validation failed with $Errors error(s)" -ForegroundColor Red
    exit 1
} elseif ($Warnings -gt 0) {
    Write-Host "⚠️  Validation passed with $Warnings warning(s)" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✅ All checks passed!" -ForegroundColor Green
    exit 0
}
