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
        echo "⚠️  $var_name is not set (optional for some features)"
        ((WARNINGS++))
    else
        echo "✅ $var_name is set"
    fi
}

# ── Core / Next.js ────────────────────────────────────────────────────────────
echo "📋 Checking core variables..."
check_required "NEXT_PUBLIC_DEMO_MODE"
check_required "NEXT_PUBLIC_CNGN_ISSUER"
check_optional "NEXT_PUBLIC_API_URL"

# ── Upstash Redis (required — middleware crashes without these) ───────────────
echo ""
echo "📋 Checking Upstash Redis variables (required for API rate-limiting)..."
check_required "UPSTASH_REDIS_REST_URL"
check_required "UPSTASH_REDIS_REST_TOKEN"

# ── M-Pesa (Daraja API) ───────────────────────────────────────────────────────
echo ""
echo "📋 Checking M-Pesa variables..."
check_optional "MPESA_CONSUMER_KEY"
check_optional "MPESA_CONSUMER_SECRET"
check_optional "MPESA_SHORTCODE"
check_optional "MPESA_PASSKEY"
check_optional "MPESA_ENV"

# ── MTN Mobile Money ──────────────────────────────────────────────────────────
echo ""
echo "📋 Checking MTN MoMo variables..."
check_optional "MTN_MOMO_SUBSCRIPTION_KEY"
check_optional "MTN_MOMO_API_USER"
check_optional "MTN_MOMO_API_KEY"
check_optional "MTN_MOMO_ENV"

# ── Paystack ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 Checking Paystack variables..."
check_optional "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"
check_optional "PAYSTACK_SECRET_KEY"

# ── Flutterwave ───────────────────────────────────────────────────────────────
echo ""
echo "📋 Checking Flutterwave variables..."
check_optional "NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY"
check_optional "FLUTTERWAVE_SECRET_KEY"
check_optional "FLUTTERWAVE_ENCRYPTION_KEY"

# ── Sentry ────────────────────────────────────────────────────────────────────
echo ""
echo "📋 Checking Sentry variables..."
check_optional "NEXT_PUBLIC_SENTRY_DSN"
check_optional "SENTRY_DSN"
check_optional "SENTRY_AUTH_TOKEN"
check_optional "SENTRY_ORG"
check_optional "SENTRY_PROJECT"

# ── Vercel CI/CD ──────────────────────────────────────────────────────────────
echo ""
echo "📋 Checking Vercel CI/CD variables..."
check_optional "VERCEL_TOKEN"
check_optional "VERCEL_ORG_ID"
check_optional "VERCEL_PROJECT_ID"

# ── Miscellaneous ─────────────────────────────────────────────────────────────
echo ""
echo "📋 Checking miscellaneous variables..."
check_optional "NEXT_PUBLIC_BILLS_WS_URL"
check_optional "LHCI_GITHUB_APP_TOKEN"

# ── Security / format checks ─────────────────────────────────────────────────
echo ""
echo "🔐 Security checks..."

# DEMO_MODE should be false in production
if [ "$NEXT_PUBLIC_DEMO_MODE" = "true" ]; then
    echo "⚠️  DEMO_MODE is enabled — DO NOT use in production!"
    ((WARNINGS++))
else
    echo "✅ DEMO_MODE is disabled"
fi

# Paystack test key warning
if [[ "$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" == *"test"* ]]; then
    echo "⚠️  Using Paystack TEST keys"
    ((WARNINGS++))
fi

# Flutterwave test key warning
if [[ "$NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY" == *"TEST"* ]]; then
    echo "⚠️  Using Flutterwave TEST keys"
    ((WARNINGS++))
fi

# M-Pesa sandbox warning
if [ "$MPESA_ENV" = "sandbox" ]; then
    echo "⚠️  M-Pesa is running in SANDBOX mode"
    ((WARNINGS++))
fi

# MTN MoMo sandbox warning
if [ "$MTN_MOMO_ENV" = "sandbox" ]; then
    echo "⚠️  MTN MoMo is running in SANDBOX mode"
    ((WARNINGS++))
fi

# Validate Stellar address format
if [ -n "$NEXT_PUBLIC_CNGN_ISSUER" ]; then
    if [[ ! "$NEXT_PUBLIC_CNGN_ISSUER" =~ ^G[A-Z0-9]{55}$ ]]; then
        echo "❌ NEXT_PUBLIC_CNGN_ISSUER has invalid format (should be 56 chars starting with G)"
        ((ERRORS++))
    else
        echo "✅ NEXT_PUBLIC_CNGN_ISSUER format is valid"
    fi
fi

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
