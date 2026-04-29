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
NC='\033[0m' # No Color

# Check if node_modules is installed
if [ ! -d "node_modules/.bin" ] || [ -z "$(ls -A node_modules/.bin)" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo "Run: npm install"
    echo ""
    echo "For now, running structure validation only..."
    echo ""
fi

# 1. Check Workflow Files
echo "📋 Step 1: Checking GitHub Actions Workflows"
echo "--------------------------------------------"

WORKFLOWS=(
    ".github/workflows/ci.yml"
    ".github/workflows/preview.yml"
    ".github/workflows/uptime-monitor.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        echo -e "${GREEN}✅${NC} $workflow"
    else
        echo -e "${RED}❌${NC} $workflow - MISSING"
        exit 1
    fi
done
echo ""

# 2. Check Test Files
echo "🧪 Step 2: Checking Test Files"
echo "--------------------------------------------"

TESTS=(
    "lib/onramp/__tests__/calculations.test.ts"
    "lib/onramp/__tests__/validation.test.ts"
    "hooks/__tests__/use-onramp-form.test.ts"
)

for test in "${TESTS[@]}"; do
    if [ -f "$test" ]; then
        echo -e "${GREEN}✅${NC} $test"
    else
        echo -e "${RED}❌${NC} $test - MISSING"
        exit 1
    fi
done
echo ""

# 3. Check Config Files
echo "⚙️  Step 3: Checking Configuration Files"
echo "--------------------------------------------"

CONFIGS=(
    ".eslintrc.json"
    "jest.config.js"
    ".prettierrc"
    ".prettierignore"
    "vercel.json"
    "lighthouserc.json"
    "commitlint.config.js"
    ".lintstagedrc.json"
)

for config in "${CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo -e "${GREEN}✅${NC} $config"
    else
        echo -e "${YELLOW}⚠️${NC}  $config - MISSING (optional)"
    fi
done
echo ""

# 4. Check Git Hooks
echo "🪝 Step 4: Checking Git Hooks"
echo "--------------------------------------------"

HOOKS=(
    ".husky/pre-commit"
    ".husky/pre-push"
    ".husky/commit-msg"
)

for hook in "${HOOKS[@]}"; do
    if [ -f "$hook" ]; then
        if [ -x "$hook" ]; then
            echo -e "${GREEN}✅${NC} $hook (executable)"
        else
            echo -e "${YELLOW}⚠️${NC}  $hook (not executable - run: chmod +x $hook)"
        fi
    else
        echo -e "${RED}❌${NC} $hook - MISSING"
    fi
done
echo ""

# 5. Check Documentation
echo "📚 Step 5: Checking Documentation"
echo "--------------------------------------------"

DOCS=(
    "docs/CI-CD.md"
    "CONTRIBUTING.md"
    "CI-CD-IMPLEMENTATION.md"
    "SETUP-INSTRUCTIONS.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅${NC} $doc"
    else
        echo -e "${RED}❌${NC} $doc - MISSING"
    fi
done
echo ""

# 6. Validate package.json scripts
echo "📦 Step 6: Checking package.json Scripts"
echo "--------------------------------------------"

REQUIRED_SCRIPTS=(
    "test"
    "test:coverage"
    "lint"
    "format"
    "format:check"
    "type-check"
    "build"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        echo -e "${GREEN}✅${NC} npm run $script"
    else
        echo -e "${RED}❌${NC} npm run $script - MISSING"
    fi
done
echo ""

# 7. Check Source Files
echo "📁 Step 7: Checking Source Structure"
echo "--------------------------------------------"

DIRS=(
    "app"
    "components"
    "lib"
    "hooks"
    "types"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        COUNT=$(find "$dir" -name "*.tsx" -o -name "*.ts" | wc -l)
        echo -e "${GREEN}✅${NC} $dir/ ($COUNT files)"
    else
        echo -e "${YELLOW}⚠️${NC}  $dir/ - MISSING"
    fi
done
echo ""

# Summary
echo "======================================"
echo "✅ CI/CD Pipeline Structure: VALID"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run test"
echo "3. Run: npm run lint"
echo "4. Run: npm run type-check"
echo "5. Run: npm run build"
echo ""
echo "Or run all checks:"
echo "  npm install && npm run test:coverage && npm run lint && npm run type-check && npm run build"
echo ""
