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

# 3. Diff Coverage (80% on changed files)
echo -e "${BLUE}🔍 Step 3: Diff Coverage (80% on changed files)${NC}"
echo "--------------------------------------------"
echo "Checking coverage on files changed since origin/main..."
# coverage/coverage-summary.json was written by the previous step.
if node scripts/check-diff-coverage.js; then
    echo -e "${GREEN}✅${NC} Diff coverage passed"
else
    echo -e "${RED}❌${NC} Diff coverage failed — add tests for the files listed above"
    exit 1
fi
echo ""

# 4. E2E (Playwright)
echo -e "${BLUE}🎭 Step 4: E2E Tests (Playwright)${NC}"
echo "--------------------------------------------"

# Verify the Chromium binary is present; guide the contributor if it isn't.
if ! npx playwright --version > /dev/null 2>&1 || \
   ! npx playwright install --dry-run chromium 2>&1 | grep -q "already installed"; then
    echo -e "${YELLOW}⚠️  Playwright Chromium browser not found.${NC}"
    echo "Run the following once to install it:"
    echo "  npx playwright install --with-deps chromium"
    echo ""
    echo "Skipping E2E tests. Re-run this script after installing the browser."
    E2E_SKIPPED=true
fi

if [ -z "$E2E_SKIPPED" ]; then
    echo "Running Playwright E2E tests..."
    if npm run test:e2e; then
        echo -e "${GREEN}✅${NC} E2E tests passed"
    else
        echo -e "${RED}❌${NC} E2E tests failed"
        echo "Run 'npx playwright show-report' for a detailed HTML report."
        exit 1
    fi
fi
echo ""

# 5. Build
echo -e "${BLUE}🏗️  Step 5: Production Build${NC}"
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

# 6. Bundle Budget (40 KB per route, gzipped)
echo -e "${BLUE}📦 Step 6: Bundle Budget (40 KB per route)${NC}"
echo "--------------------------------------------"
echo "Checking route-specific JS bundle sizes..."
# .next/ was written by the previous step.
if node scripts/check-bundle-budget.mjs; then
    echo -e "${GREEN}✅${NC} Bundle budget passed"
else
    echo -e "${RED}❌${NC} Bundle budget exceeded — see output above for the offending route(s)"
    echo ""
    echo "Tips:"
    echo "  • Move large imports behind 'next/dynamic' to code-split them out of the route."
    echo "  • Run 'npm run build:analyze' and open .next/analyze/ to find large dependencies."
    exit 1
fi
echo ""

# Summary
echo "======================================"
if [ -n "$E2E_SKIPPED" ]; then
    echo -e "${YELLOW}⚠️  Almost ready to push — E2E tests were skipped.${NC}"
    echo "Install the Playwright browser and re-run:"
    echo "  npx playwright install --with-deps chromium"
    echo "  ./test-ci-local.sh"
else
    echo -e "${GREEN}✅ All CI checks passed!${NC}"
fi
echo "======================================"
echo ""
echo "The following jobs will run on GitHub Actions:"
echo "  1. Code Quality   — ESLint, Prettier, TypeScript"
echo "  2. Tests          — Jest + coverage report + Codecov upload"
echo "  3. Diff Coverage  — 80% statement/line on changed files (PR only)"
echo "  4. E2E            — Playwright Chromium suite"
echo "  5. Build          — Next.js production build"
echo "  6. Bundle Budget  — 40 KB gzipped per route"
echo ""
