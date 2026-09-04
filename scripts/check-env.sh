#!/bin/bash

# Environment Variables Validation Script
# Checks if all required environment variables are set

set -e

echo "🔍 Checking Environment Variables..."
echo ""

ENV_FILE=".env.local"
ERRORS=0
WARNINGS=0

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found!"
    echo "   Run: cp .env.example .env.local"
    exit 1
fi

echo "✅ Found $ENV_FILE"
echo ""

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# ── Helpers ───────────────────────────────────────────────────────────────────

check_required() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo "❌ $var_name is not set"
        ((ERRORS++))
    else
        echo "✅ $var_name is set"
    fi
}

check_optional() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo "⚠️  $var_name is not set (optional)"
        ((WARNINGS++))
    else
        echo "✅ $var_name is set"
    fi
}

# ── Core / Next.js ────────────────────────────────────────────────────────────
echo "📋 Checking core variables..."
check_optional "NEXT_PUBLIC_API_URL"

# ── Sentry (optional error tracking) ──────────────────────────────────────────
echo ""
echo "📋 Checking Sentry variables (optional)..."
check_optional "NEXT_PUBLIC_SENTRY_DSN"
check_optional "SENTRY_AUTH_TOKEN"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================"

if [ $ERRORS -gt 0 ]; then
    echo "❌ Validation failed with $ERRORS error(s)"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Validation passed with $WARNINGS warning(s)"
    exit 0
else
    echo "✅ All checks passed!"
    exit 0
fi
