# Contributing to Gardener

Thank you for your interest in contributing to Gardener!

## Getting Started

```bash
git clone https://github.com/mniedermaier/gardener.git
cd gardener
npm install
npm run dev
```

## Development

- `npm run dev` — Start dev server at localhost:5173
- `npm run test` — Run unit tests (Vitest)
- `npm run test:e2e` — Run E2E tests (Playwright)
- `npm run build` — TypeScript check + production build

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure tests pass: `npm run test && npm run build`
5. Commit your changes with a descriptive message
6. Push to your fork and open a Pull Request

## Guidelines

- **Code style**: TypeScript, Tailwind CSS, named exports
- **State management**: Use `useStore(useShallow(...))` — never bare `useStore()`
- **i18n**: Add translations in all 4 languages (DE, EN, ES, FR)
- **Components**: Use existing UI primitives from `src/components/ui/`
- **Testing**: Add tests for new logic in `src/lib/`
- **Performance**: Use `React.memo()`, `useMemo()`, and `useShallow()` where appropriate

## Adding a New Plant

See [CLAUDE.md](CLAUDE.md#adding-a-new-plant) for the checklist.

## Adding a New Page

See [CLAUDE.md](CLAUDE.md#adding-a-new-page) for the checklist.

## Reporting Bugs

Use the [bug report template](https://github.com/mniedermaier/gardener/issues/new?template=bug_report.yml).

## Feature Requests

Use the [feature request template](https://github.com/mniedermaier/gardener/issues/new?template=feature_request.yml).

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
