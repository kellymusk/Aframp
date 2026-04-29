# 🤝 How to Contribute

We welcome contributions from the community! To ensure a smooth process, please follow these guidelines.

## Development Setup

### Prerequisites

- Node.js v18 or higher
- npm or pnpm
- Git
- A Stellar wallet (Freighter recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/Aframp.git
cd Aframp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Testing Requirements

### Before Submitting a PR

All PRs must pass the following checks:

1. **Code Quality**

   ```bash
   npm run lint        # ESLint
   npm run format:check # Prettier
   npm run type-check  # TypeScript
   ```

2. **Tests**

   ```bash
   npm run test:coverage
   ```

   - Minimum 70% coverage required
   - All tests must pass
   - Add tests for new features

3. **Build**

   ```bash
   npm run build
   ```

   - Must build successfully
   - Bundle size must be within limits

### Writing Tests

We use Jest and React Testing Library. Tests should cover:

- **Unit tests** for utility functions
- **Integration tests** for components
- **Edge cases** and error handling

Example test structure:

```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Pull Request Process

### 1. Fork and Create Branch

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Aframp.git
cd Aframp

# Create a feature branch
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clear, well-commented code
- Follow existing code style
- Add tests for new features
- Update documentation if needed

### 3. Commit Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(onramp): add KES currency support"
git commit -m "fix(validation): correct wallet address regex"
git commit -m "docs(readme): update setup instructions"
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 4. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then open a PR on GitHub with:

- Clear title following conventional commits
- Description of changes
- Screenshots for UI changes
- Link to related issue

### 5. PR Review

- CI checks must pass (code quality, tests, build, Lighthouse)
- At least 1 approval required
- Address review feedback
- Keep PR up to date with main branch

## When CI Fails

### Code Quality Failures

```bash
npm run lint -- --fix
npm run format
npm run type-check
```

### Test Failures

```bash
npm run test:watch
npm test -- path/to/test.test.ts
npm run test:coverage
```

### Build Failures

```bash
npm run build
rm -rf .next node_modules
npm install
npm run build
```

### Lighthouse Failures

- **Performance:** Optimize images, reduce bundle size
- **Accessibility:** Add alt text, ARIA labels, proper headings

## Code Style Guidelines

### TypeScript

- Use strict mode
- Avoid `any` (use `unknown` or proper types)
- Export types and interfaces

### React Components

- Use functional components with hooks
- Extract complex logic to custom hooks
- Use TypeScript for props

### File Naming

- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utils: `kebab-case.ts`
- Tests: `*.test.ts` or `*.test.tsx`

## Git Hooks

We use Husky for git hooks:

- **pre-commit:** Runs lint-staged (lints and formats staged files)
- **pre-push:** Runs tests
- **commit-msg:** Validates commit message format

## Need Help?

- 📖 Read the [CI/CD documentation](./docs/CI-CD.md)
- 🐛 Open an issue for bugs
- 💡 Open a discussion for feature ideas

Thank you for contributing to AFRAMP! 🌍🚀
