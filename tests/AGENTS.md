# AGENTS.md — tests/

Instructions for AI coding agents working in the test suite. Repo-wide standards live in [../AGENTS.md](../AGENTS.md).

## Layout

| Path | Runner | Purpose |
| --- | --- | --- |
| `tests/unit/` | Vitest | Logic, modules, mocks, 100% coverage |
| `tests/visual/` | Playwright | Screenshot regression for all fractals |
| `tests/setup.js` | Vitest | Global setup (localStorage mock, console filtering) |

Vitest excludes `tests/visual/**` (see `vitest.config.js`). Visual tests run separately via `npm run test:visual`.

## Unit tests (Vitest)

### Commands

```bash
npm test                              # All Vitest tests
npm run test:unit                     # Same as above (explicit)
npm run test:watch                    # Watch mode
npx vitest run tests/unit/config.test.js   # Single file
npx vitest run -t "imports module"    # Filter by test name
```

### Conventions

- **Naming**: Mirror source paths with hyphens — e.g. `static/js/rendering/adaptive-quality.js` → `tests/unit/rendering-adaptive-quality.test.js`.
- **Imports**: ESM only (`import` / `export`). Use `vitest` (`describe`, `it`, `expect`, `vi`).
- **Determinism**: No uncontrolled time, network, or randomness. Mock `localStorage`, `canvas`, `fullscreen`, and other browser APIs explicitly when needed.
- **Root cause**: Fix failing tests by fixing the code or updating the test to match a deliberate requirement change — do not loosen assertions to paper over bugs.

### Coverage

`vitest.config.js` enforces **100%** thresholds (lines, functions, branches, statements) on `static/js/**/*.js`. New or changed application code needs corresponding unit tests.

### Structural import test

`tests/unit/all-modules-import.test.js` recursively imports every `.js` file under `static/js/`. Any new module must be importable without side-effect errors, or this test fails.

### Setup file

`tests/setup.js` provides:

- In-memory `localStorage` for deterministic tests
- Filters for benign jsdom navigation warnings and expected init/ML log noise

Do not rely on real browser storage or network in unit tests.

## Visual regression (Playwright)

### Commands

```bash
npm run test:visual                   # Compare against baselines
npm run test:visual:update            # Regenerate baselines (intentional visual changes only)
npm run test:visual:ui                # Interactive UI
npm run test:visual:report            # Open HTML report
npx playwright test -g "mandelbrot"   # Single fractal
```

### Key files

- `tests/visual/fractal-list.js` — fractal IDs and per-fractal config (iterations, wait time, threshold)
- `tests/visual/fractal-visual.test.js` — main snapshot test
- `tests/visual/fractal-visual.test.js-snapshots/` — baseline PNGs (commit with intentional updates)
- `playwright.config.js` — Playwright config (repo root)

See [tests/visual/README.md](visual/README.md) for detailed troubleshooting.

### When to run / update

| Change | Action |
| --- | --- |
| Rendering, shaders, color schemes | `npm run test:visual` |
| Intentional visual change | `npm run test:visual:update` and review diffs |
| Random/variable fractals | Adjust threshold in `fractal-list.js`; prefer deterministic seeds when supported |
| Logic-only (no pixel output) | Unit tests may suffice |

Only update snapshots when the visual change is deliberate. Review diff images before committing new baselines.

## Verification checklist

After editing tests or the code they cover:

1. `npm run test:unit` (or targeted `npx vitest run …`)
2. `npm run lint` if JS test files changed
3. `npm run test:visual` if fractal rendering or appearance changed
