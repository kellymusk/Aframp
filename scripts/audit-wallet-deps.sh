#!/usr/bin/env bash
# Wallet dependency audit script
set -euo pipefail

echo "=== Wallet Dependency Security Audit ==="
echo ""

# Audit Stellar-related packages
echo "--- Stellar Dependencies ---"
npm ls @stellar/stellar-sdk @stellar/freighter-api 2>/dev/null || true

# Check for known advisories
echo ""
echo "--- npm Audit (high/critical only) ---"
npm audit --audit-level=high 2>&1 || true

# Check for outdated packages
echo ""
echo "--- Outdated Packages ---"
npm outdated 2>&1 || true

# Check wallet-related source files for common issues
echo ""
echo "--- Wallet Source Code Scan ---"
WALLET_FILES=$(find lib/wallet components/Wallet -name "*.ts" -o -name "*.tsx" 2>/dev/null)

if [ -n "$WALLET_FILES" ]; then
  echo "Scanning wallet files for potential security issues..."

  # Check for hardcoded secrets
  echo "  [*] Hardcoded secrets check..."
  if grep -rn 'api[Kk]ey\|secret\|password\|token\|private_key' lib/wallet components/Wallet --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v 'getItem\|setItem\|sessionStorage\|//\|/\*'; then
    echo "    WARNING: Possible hardcoded secrets found!"
  else
    echo "    OK: No hardcoded secrets detected"
  fi

  # Check localStorage usage
  echo "  [*] Storage audit..."
  if grep -rn 'localStorage' lib/wallet components/Wallet --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "    WARNING: localStorage usage detected (prefer sessionStorage)"
  else
    echo "    OK: Using sessionStorage (preferred)"
  fi

  # Check console.log of sensitive data
  echo "  [*] Sensitive data logging..."
  if grep -rn 'console\.\(log\|dir\|debug\)' lib/wallet --include="*.ts" 2>/dev/null | grep -i 'mnemonic\|seed\|key\|phrase'; then
    echo "    WARNING: Possible sensitive data logged!"
  else
    echo "    OK: No sensitive data logging detected"
  fi
else
  echo "No wallet files found to scan."
fi

echo ""
echo "=== Audit Complete ==="
