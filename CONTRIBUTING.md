# Contributing to ElectionIQ

Thank you for your interest in improving ElectionIQ! This document outlines how to contribute effectively.

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/namanraii/Election-Process.git
cd Election-Process

# Install dependencies
npm install

# Start local server
npm run serve
# Open http://localhost:3000
```

## 📋 Code Standards

### JavaScript
- **ES Modules** (`import`/`export`) — no CommonJS in frontend code
- **ESLint** enforced — run `npm run lint` before committing
- **`prefer-const`** — use `const` by default, `let` only when reassignment is needed
- **No `var`** — enforced by ESLint
- **No direct `console.*`** — use `logger.js` for all logging (enforced by `no-console` rule)
- **Arrow functions** preferred for callbacks (`prefer-arrow-callback`)

### Naming Conventions
- **Files**: `kebab-case.js` (e.g., `intent.js`, `bigquery.js`)
- **Functions**: `camelCase` (e.g., `classifyIntent`, `routeAIQuery`)
- **Private functions**: Prefixed with `_` (e.g., `_evaluate`, `_buildContextBlock`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CF_TIMEOUT_MS`, `MAX_MARKERS`)
- **Modules**: Each file has a `@module` JSDoc tag

### Documentation
- Every exported function must have a JSDoc comment with:
  - `@param` for all parameters
  - `@returns` with type annotation
  - `@example` for non-trivial functions
- Module-level `@description` explaining the file's role in the pipeline

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run coverage
```

### Test Requirements
- All new modules must have corresponding test files in `tests/`
- Tests use **Jest** with **ES module** support
- Mock external dependencies using `jest.unstable_mockModule()`
- Test files follow the naming pattern: `<module>.test.js`

## 🔒 Security

- **Never commit API keys** — use placeholders in `config.js`
- **All user input** must pass through `sanitise()` in `utils.js`
- **No `eval()`** or `innerHTML` with user data
- See [SECURITY.md](./SECURITY.md) for the full security policy

## 📦 Deployment

Deployment is handled via Google Cloud Build. See the [README](./README.md) for deployment commands.
