# Contributing to AFRAMP

Thank you for your interest in contributing to AFRAMP! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0
- Git
- GitHub account

### Setup

1. **Fork the repository**
   ```bash
   # On GitHub, click "Fork"
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aframp.git
   cd aframp
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/aframp/aframp.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### 1. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/descriptive-name
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### 2. Make Changes

```bash
# Edit files
# Run tests frequently
npm run test:watch

# Check code quality
npm run lint
npm run format:check
npm run type-check
```

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: add new payment method"
```

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Test additions
- `chore` - Maintenance

**Example:**
```
feat(kyc): add document verification

Add support for document verification in KYC flow.
Implements OCR-based validation for ID documents.

Closes #123
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template
5. Submit for review

---

## Code Standards

### TypeScript

- Use strict mode (enabled by default)
- Add explicit return types to functions
- Avoid `any` type (use `unknown` if needed)
- Use interfaces for object shapes

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Avoid
function getUser(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and reusable
- Add prop types/interfaces
- Use meaningful component names

```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

// ❌ Avoid
export function Btn(props: any) {
  return <button {...props} />
}
```

### Styling

- Use Tailwind CSS classes
- Avoid inline styles
- Use CSS modules for complex styles
- Follow mobile-first approach

```typescript
// ✅ Good
<div className="flex flex-col gap-4 md:flex-row">
  <button className="px-4 py-2 bg-blue-500 text-white rounded">
    Click me
  </button>
</div>

// ❌ Avoid
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
    Click me
  </button>
</div>
```

### File Organization

```
components/
├── common/           # Reusable components
│   ├── Button.tsx
│   └── Modal.tsx
├── kyc/              # Feature-specific
│   ├── KycForm.tsx
│   └── KycStatus.tsx
└── __tests__/        # Tests
    └── Button.test.tsx
```

---

## Testing

### Writing Tests

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn()
    render(<Button label="Click me" onClick={onClick} />)
    
    await userEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Coverage Requirements

- **Minimum:** 70% across all metrics
- **Target:** 80%+ for new code
- **Metrics:** Lines, Statements, Functions, Branches

---

## Submitting Changes

### Before Submitting

1. **Run local CI checks**
   ```bash
   ./test-ci-local.sh
   ```

2. **Verify all checks pass**
   - ✅ ESLint
   - ✅ Prettier
   - ✅ TypeScript
   - ✅ Tests
   - ✅ Build

3. **Update documentation**
   - Add/update comments
   - Update README if needed
   - Document breaking changes

### PR Checklist

- [ ] Branch created from `develop` or `main`
- [ ] Commits follow conventional format
- [ ] Tests added/updated
- [ ] Coverage maintained (≥70%)
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] Local CI checks pass

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
Describe testing performed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Coverage maintained
- [ ] Documentation updated
```

---

## CI/CD Pipeline

### Automated Checks

When you push or create a PR, GitHub Actions automatically runs:

1. **Code Quality** (2-3 min)
   - ESLint
   - Prettier
   - TypeScript

2. **Tests** (3-5 min)
   - Jest tests
   - Coverage report
   - Codecov upload

3. **Build** (4-6 min)
   - Next.js production build
   - Artifact upload

### Workflow Status

- ✅ All checks pass → Ready to merge
- ❌ Any check fails → Fix issues and push again
- ⏳ Checks running → Wait for completion

### Viewing Results

1. Go to PR
2. Scroll to "Checks" section
3. Click on failed check to see logs
4. Fix issues locally
5. Push again

---

## Troubleshooting

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm run test:coverage
```

### Linting Errors

```bash
# Auto-fix formatting
npm run format

# Check remaining issues
npm run lint
```

### Build Failures

```bash
# Check TypeScript
npm run type-check

# Try clean build
rm -rf .next
npm run build
```

### Git Issues

```bash
# Update branch with latest main
git fetch upstream
git rebase upstream/main

# Force push (use carefully!)
git push origin feature/name --force-with-lease
```

---

## Code Review Process

### What Reviewers Look For

- ✅ Code follows style guide
- ✅ Tests are comprehensive
- ✅ No breaking changes
- ✅ Documentation is clear
- ✅ Performance is acceptable
- ✅ Security best practices followed

### Responding to Feedback

1. Read feedback carefully
2. Ask questions if unclear
3. Make requested changes
4. Push updates
5. Mark conversations as resolved

---

## Resources

- [CI/CD Setup Guide](./CI-CD-SETUP.md)
- [GitHub Actions Workflows](./.github/WORKFLOWS.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Questions?

- Check existing issues/discussions
- Ask in PR comments
- Contact team lead
- Review documentation

---

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

Thank you for contributing to AFRAMP! 🚀
