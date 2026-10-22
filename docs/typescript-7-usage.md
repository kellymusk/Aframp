# Using TypeScript 7.0 in This Project

This project uses a **dual TypeScript setup** to get the best of both worlds:
- **TypeScript 5.x** for tooling compatibility (ESLint, Jest, Next.js)
- **TypeScript 7.0** for 10x faster type-checking

## Quick Start

```bash
# Install dependencies (includes both TypeScript versions)
npm install

# Regular type-check (TypeScript 5.x) - existing workflow
npm run type-check

# Fast type-check (TypeScript 7.0) - NEW, 10x faster!
npm run type-check:ts7
```

## Why Dual Setup?

TypeScript 7.0's native Go compiler is **~10x faster** but doesn't yet have a stable programmatic API. Tools like typescript-eslint and ts-jest need the old API. The dual setup lets us:

✅ Get 10x faster type-checking now  
✅ Keep all existing tools working  
✅ No breaking changes to workflows  

## What Uses Which Version?

### TypeScript 5.x (`typescript` package)
- ESLint / typescript-eslint
- Jest / ts-jest  
- Next.js build system
- IDE language server (default)
- `npm run type-check` script

### TypeScript 7.0 (`typescript-7` alias)
- `npm run type-check:ts7` script
- CI/CD pipelines (optional, for speed)
- Manual `npx -p typescript-7 tsc` commands

## Performance Comparison

| Command | TypeScript Version | Typical Speed |
|---------|-------------------|---------------|
| `npm run type-check` | 5.x | Baseline (100%) |
| `npm run type-check:ts7` | 7.0 | **~10x faster** |

*Actual speedup varies by project size and hardware. Larger projects see bigger gains.*

## CI/CD Integration

You can add TypeScript 7.0 checks to your CI pipeline for faster builds:

```yaml
# .github/workflows/ci.yml
- name: Type check (TypeScript 7.0)
  run: npm run type-check:ts7
```

## When Can We Fully Migrate?

We'll migrate to TypeScript 7.x as the primary version when:
1. typescript-eslint adds TypeScript 7.x peer dependency support
2. ts-jest adds TypeScript 7.x API compatibility
3. TypeScript 7.1 ships with stable programmatic API

Expected timeline: **Q1-Q2 2027**

Track progress:
- [typescript-eslint TS7 support](https://github.com/typescript-eslint/typescript-eslint/issues/12518)
- [ts-jest TS7 support](https://github.com/kulshekhar/ts-jest/issues/5366)

## Troubleshooting

### Both versions should pass
If `type-check` passes but `type-check:ts7` fails (or vice versa), this indicates a real issue:
- TypeScript 7.0 has stricter type checking in some areas
- Report discrepancies - they're useful for the TypeScript team

### Installing/updating packages
```bash
# Update TypeScript 5.x (for tooling)
npm install -D typescript@latest

# Update TypeScript 7.x (for fast checking)
npm install -D typescript-7@npm:typescript@^7
```

## References

- [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Dual setup guide](https://dev.to/dev_encyclopedia/why-your-typescript-7-upgrade-broke-eslint-ts-jest-and-ts-morph-385k)
- [Migration readiness check](https://www.digitalapplied.com/blog/typescript-7-native-compiler-early-adopter-migration-readiness)
- [Full decision record](../DEPENDENCY-UPGRADE-DECISION.md)
