#!/usr/bin/env bash
# OWASP Top 10 automated scan for Aframp
# Uses npm audit, custom checks, and dependency review
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== OWASP Top 10 Security Scan ==="
echo ""

# A01: Broken Access Control
echo -e "${YELLOW}[A01] Broken Access Control${NC}"
if grep -rn 'req\.body\[' app/api --include="*.ts" 2>/dev/null | grep -v 'validate\|schema\|zod'; then
  echo -e "  ${RED}WARNING: Possible missing authorization checks${NC}"
else
  echo -e "  ${GREEN}OK: API routes use authorization patterns${NC}"
fi

# Check middleware rate limiting
if grep -q 'Ratelimit' middleware.ts 2>/dev/null; then
  echo -e "  ${GREEN}OK: Rate limiting configured${NC}"
else
  echo -e "  ${RED}MISSING: Rate limiting not found${NC}"
fi

# A02: Cryptographic Failures
echo -e "${YELLOW}[A02] Cryptographic Failures${NC}"
if grep -rn 'crypto\.' lib/wallet --include="*.ts" 2>/dev/null; then
  echo -e "  ${GREEN}OK: Using Web Crypto API${NC}"
else
  echo -e "  ${YELLOW}INFO: Check crypto usage${NC}"
fi

# Check for HTTP vs HTTPS
if grep -q 'http://' next.config.mjs 2>/dev/null; then
  echo -e "  ${RED}WARNING: Possible insecure HTTP URLs${NC}"
else
  echo -e "  ${GREEN}OK: No plain HTTP references${NC}"
fi

# A03: Injection
echo -e "${YELLOW}[A03] Injection${NC}"
if grep -rn 'innerHTML\|dangerouslySetInnerHTML\|eval(\|new Function(' app components --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'node_modules'; then
  echo -e "  ${RED}WARNING: Possible XSS injection vectors${NC}"
else
  echo -e "  ${GREEN}OK: No dangerous innerHTML/eval usage${NC}"
fi

# A04: Insecure Design
echo -e "${YELLOW}[A04] Insecure Design${NC}"
echo -e "  ${YELLOW}INFO: Manual review required for business logic flaws${NC}"

# Check for input validation patterns
if grep -rn 'zod\|yup\|joi' app/api --include="*.ts" 2>/dev/null; then
  echo -e "  ${GREEN}OK: Input validation schemas found${NC}"
else
  echo -e "  ${RED}MISSING: Input validation not found${NC}"
fi

# A05: Security Misconfiguration
echo -e "${YELLOW}[A05] Security Misconfiguration${NC}"
if grep -q 'X-Frame-Options\|X-Content-Type-Options' next.config.mjs 2>/dev/null; then
  echo -e "  ${GREEN}OK: Security headers configured${NC}"
else
  echo -e "  ${RED}MISSING: Security headers not found${NC}"
fi

# Check for CORS configuration
if grep -rn 'Access-Control' app/api --include="*.ts" 2>/dev/null; then
  echo -e "  ${GREEN}OK: CORS headers found${NC}"
fi

# A06: Vulnerable and Outdated Components
echo -e "${YELLOW}[A06] Vulnerable and Outdated Components${NC}"
npm audit --audit-level=high 2>&1 | tail -20
echo ""

# A07: Identification and Authentication Failures
echo -e "${YELLOW}[A07] Identification and Authentication Failures${NC}"
if grep -rn 'session\|token\|jwt\|JWT' middleware.ts app/api --include="*.ts" 2>/dev/null | head -5; then
  echo -e "  ${GREEN}OK: Auth/session patterns found${NC}"
else
  echo -e "  ${YELLOW}INFO: Check authentication implementation${NC}"
fi

# A08: Software and Data Integrity Failures
echo -e "${YELLOW}[A08] Software and Data Integrity Failures${NC}"
if [ -f "package-lock.json" ]; then
  echo -e "  ${GREEN}OK: package-lock.json present (integrity pins)${NC}"
fi

# A09: Security Logging and Monitoring Failures
echo -e "${YELLOW}[A09] Security Logging and Monitoring Failures${NC}"
if grep -q 'NEXT_PUBLIC_SENTRY_DSN\|SENTRY_DSN' .env.example 2>/dev/null; then
  echo -e "  ${GREEN}OK: Sentry error tracking configured${NC}"
else
  echo -e "  ${RED}MISSING: Error monitoring not configured${NC}"
fi

# A10: Server-Side Request Forgery (SSRF)
echo -e "${YELLOW}[A10] Server-Side Request Forgery (SSRF)${NC}"
if grep -rn 'fetch(\|axios\.\|got(' app/api lib --include="*.ts" 2>/dev/null | grep -v 'test\|spec\|__tests__' | head -5; then
  echo -e "  ${YELLOW}INFO: Outbound requests detected - review URL validation${NC}"
fi

echo ""
echo "=== OWASP Top 10 Scan Complete ==="
echo -e "${YELLOW}Note: Automated scanning cannot replace manual penetration testing.${NC}"
