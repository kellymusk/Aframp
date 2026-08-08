# AFRAMP Quick Setup Script (Windows PowerShell)
# Gets you running in under 5 minutes

$ErrorActionPreference = "Stop"

Write-Host "🌍 AFRAMP Quick Setup" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js v18+ first." -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm -v
    Write-Host "✅ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check Node version
$nodeVersionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($nodeVersionNumber -lt 18) {
    Write-Host "❌ Node.js version must be 18 or higher. Current: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Check for Docker (optional)
$dockerAvailable = $false
try {
    $dockerVersion = docker --version
    Write-Host "✅ $dockerVersion" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host "⚠️  Docker not found (optional)" -ForegroundColor Yellow
}

Write-Host ""

# Setup environment
Write-Host "🔧 Setting up environment..." -ForegroundColor Yellow

if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
    Write-Host "✅ Created .env.local from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env.local with your API keys" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}

Write-Host ""

# Ask user preference
Write-Host "Choose setup method:" -ForegroundColor Cyan
Write-Host "1) Docker (recommended - isolated environment)"
Write-Host "2) Node.js (direct - faster startup)"
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

Write-Host ""

if ($choice -eq "1") {
    if (-not $dockerAvailable) {
        Write-Host "❌ Docker is not installed. Please install Docker first or choose option 2." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🐳 Starting with Docker..." -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Building and starting containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up --build -d
    
    Write-Host ""
    Write-Host "✅ Docker setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Edit .env.local with your API keys"
    Write-Host "   2. Access the app at http://localhost:3000"
    Write-Host "   3. View logs: docker-compose -f docker-compose.dev.yml logs -f"
    Write-Host "   4. Stop: docker-compose -f docker-compose.dev.yml down"
    
} elseif ($choice -eq "2") {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    
    Write-Host ""
    Write-Host "✅ Node.js setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Edit .env.local with your API keys"
    Write-Host "   2. Run: npm run dev"
    Write-Host "   3. Access the app at http://localhost:3000"
    
} else {
    Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete! Happy coding!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - README.md - Project overview"
Write-Host "   - DEPLOYMENT.md - Deployment guide"
Write-Host "   - .env.example - Environment variables reference"
Write-Host ""
