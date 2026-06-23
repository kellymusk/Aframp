#!/bin/bash

# CI/CD Pipeline Local Test Script
# This simulates what GitHub Actions will run

set -e

echo "🚀 AFRAMP CI/CD Pipeline - Local Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if node_modules is installed
if [ ! -d "node_modules/.bin" ] || [ -z "$(ls -A node_modules/.bin)" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo "Run: npm install"
    exit 1
fi

# 1. Code Quality Checks
echo -e "${BLUE}📋 Step 1: Code Quality Checks${NC}"
echo "--------------------------------------------"

echo "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} ESLint passed"
else
    echo -e "${RED}❌${NC} ESLint failed"
    npm run lint
    exit 1
fi

echo "Running Prettier check..."
if npm run format:check > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Prettier check passed"
else
    echo -e "${RED}❌${NC} Prettier check failed"
    npm run format:check
    exit 1
fi

echo "Running TypeScript check..."
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} TypeScript check passed"
else
    echo -e "${RED}❌${NC} TypeScript check failed"
    npm run type-check
    exit 1
fi
echo ""

# 2. Tests & Coverage
echo -e "${BLUE}🧪 Step 2: Tests & Coverage${NC}"
echo "--------------------------------------------"

echo "Running tests with coverage..."
if npm run test:coverage -- --watchAll=false > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Tests passed"
    
    # Display coverage summary
    if [ -f "coverage/coverage-summary.json" ]; then
        echo ""
        echo "Coverage Summary:"
        node -e "
        const coverage = require('./coverage/coverage-summary.json');
        const total = coverage.total;
        const badge = (pct) => pct >= 80 ? '🟢' : pct >= 70 ? '🟡' : '🔴';
        console.log('  Lines:      ' + total.lines.pct + '% ' + badge(total.lines.pct));
        console.log('  Statements: ' + total.statements.pct + '% ' + badge(total.statements.pct));
        console.log('  Functions:  ' + total.functions.pct + '% ' + badge(total.functions.pct));
        console.log('  Branches:   ' + total.branches.pct + '% ' + badge(total.branches.pct));
        "
    fi
else
    echo -e "${RED}❌${NC} Tests failed"
    npm run test:coverage -- --watchAll=false
    exit 1
fi
echo ""

# 3. Build
echo -e "${BLUE}🏗️  Step 3: Production Build${NC}"
echo "--------------------------------------------"

echo "Building production bundle..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Build successful"
    
    # Show build size
    if [ -d ".next" ]; then
        SIZE=$(du -sh .next | cut -f1)
        echo "  Build size: $SIZE"
    fi
else
    echo -e "${RED}❌${NC} Build failed"
    npm run build
    exit 1
fi
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ All CI checks passed!${NC}"
echo "======================================"
echo ""
echo "Ready to push. The following will run on GitHub:"
echo "  1. Code Quality (ESLint, Prettier, TypeScript)"
echo "  2. Tests & Coverage (Jest with Codecov upload)"
echo "  3. Production Build"
echo ""
