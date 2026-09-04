# Containerized Testing Guide

## Overview

This project uses Docker containers for running tests to ensure consistency between local development and CI environments. ✅ **CI integration complete** - All tests now run in containers.

## Quick Start

### Running Tests

```bash
# Run all tests with coverage
docker-compose -f docker-compose.test.yml run --rm aframp-test

# Run linting
docker-compose -f docker-compose.test.yml run --rm aframp-lint

# Run type checking
docker-compose -f docker-compose.test.yml run --rm aframp-typecheck

# Build test image
docker-compose -f docker-compose.test.yml build
```

## Environment Configuration

The test container automatically sets:

```bash
NODE_ENV=test
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
CI=true
```

## CI Integration ✅ COMPLETE

The GitHub Actions workflow (`.github/workflows/ci.yml`) now uses Docker containers for all test jobs:

- **code-quality**: Runs lint, type-check, and prettier checks in containers
- **test**: Runs full test suite with coverage in containers
- **diff-coverage**: Validates coverage on changed files in containers

Docker layer caching is enabled via GitHub Actions cache to speed up builds between runs.

## Benefits

- ✅ **Consistency**: Same environment locally and in CI
- ✅ **Isolation**: Tests run in clean container each time
- ✅ **Reproducibility**: No "works on my machine" issues
- ✅ **Caching**: Docker layer caching speeds up repeated runs (active in CI)

## Advanced Usage

### Running Specific Tests

```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test npm test -- path/to/test.spec.ts
```

### Debugging in Container

```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test sh
```

### Cleaning Up

```bash
docker-compose -f docker-compose.test.yml down -v
```

## Troubleshooting

### Container builds slowly
**Solution**: BuildKit is enabled by default in CI. Locally use:
```bash
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.test.yml build
```

### Tests fail in container but work locally
**Solution**: Check environment variables
```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test env | sort
```

### Coverage files not generated
**Solution**: Ensure the coverage volume mount is correct
```bash
ls -la ./coverage
```

---

**Last Updated**: 2026-08-29  
**Status**: ✅ Production Ready - CI Integrated  
**Maintainer**: Aframp Engineering Team
