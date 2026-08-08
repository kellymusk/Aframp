#!/bin/bash

# AFRAMP Quick Setup Script
# Gets you running in under 5 minutes

set -e

echo "🌍 AFRAMP Quick Setup"
echo "===================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found (optional)"
    DOCKER_AVAILABLE=false
fi

echo ""

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo "⚠️  Please edit .env.local with your API keys"
else
    echo "✅ .env.local already exists"
fi

echo ""

# Ask user preference
echo "Choose setup method:"
echo "1) Docker (recommended - isolated environment)"
echo "2) Node.js (direct - faster startup)"
echo ""
read -p "Enter choice (1 or 2): " choice

echo ""

if [ "$choice" = "1" ]; then
    if [ "$DOCKER_AVAILABLE" = false ]; then
        echo "❌ Docker is not installed. Please install Docker first or choose option 2."
        exit 1
    fi
    
    echo "🐳 Starting with Docker..."
    echo ""
    
    # Check if docker-compose or docker compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    echo "Building and starting containers..."
    $COMPOSE_CMD -f docker-compose.dev.yml up --build -d
    
    echo ""
    echo "✅ Docker setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Edit .env.local with your API keys"
    echo "   2. Access the app at http://localhost:3000"
    echo "   3. View logs: $COMPOSE_CMD -f docker-compose.dev.yml logs -f"
    echo "   4. Stop: $COMPOSE_CMD -f docker-compose.dev.yml down"
    
elif [ "$choice" = "2" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    echo ""
    echo "✅ Node.js setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Edit .env.local with your API keys"
    echo "   2. Run: npm run dev"
    echo "   3. Access the app at http://localhost:3000"
    
else
    echo "❌ Invalid choice. Please run the script again."
    exit 1
fi

echo ""
echo "🎉 Setup complete! Happy coding!"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Project overview"
echo "   - DEPLOYMENT.md - Deployment guide"
echo "   - .env.example - Environment variables reference"
echo ""
