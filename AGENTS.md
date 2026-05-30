# AGENTS.md

Instructions for AI coding agents working in this repository. Human-oriented docs live in [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

These standards mirror [`.cursor/rules/`](.cursor/rules/) so the same guidance applies inside and outside Cursor.

## Project overview

FractalAI is a web-based fractal generator (regl + WebGL) with 100+ fractal types, real-time rendering, ML-powered discovery (Synaptic.js), and extensive performance optimizations.

- **Stack**: Vanilla JavaScript (ESM), Vite, Vitest, Playwright, CSS
- **Entry**: `static/js/core/initialization.js` via `index.html`
- **Config / feature flags**: `static/js/core/config.js`
- **Fractals**: `static/js/fractals/2d/` (organized by family)
- **Rendering**: `static/js/rendering/`
- **License**: CC-BY-4.0

## Dev environment

- **Node.js**: `22.16.0` (see [`.nvmrc`](.nvmrc)). Run `nvm use` if you use nvm.
- **npm**: v10+ (`package.json` engines: `node >=22.16.0`, `npm >=10.0.0`).
- **Install**: `npm install`
- **Dev server**: `npm start` or `npm run dev` → typically `http://localhost:5173`
- **Do not** widen dev-server network exposure (`server.host: true` / `0.0.0.0`) unless explicitly required. Use `npm run dev:network` only when LAN testing is needed.

Useful paths when navigating:

| Area | Location |
| --- | --- |
| App entry | `static/js/core/initialization.js` |
| State / init | `static/js/core/` |
| Fractal implementations | `static/js/fractals/2d/` |
| Shaders / render engine | `static/js/rendering/` |
| UI controls | `static/js/ui/` |
| Unit tests | `tests/unit/` |
| Visual tests | `tests/visual/` |
| Build scripts | `scripts/` |
| Vite config | `vite.config.js` |

## Build and verification

Run the closest checks after substantive changes:

| Change type | Command |
| --- | --- |
| Build-affecting | `npm run build` |
| Logic / unit tests | `npm test` or `npm run test:unit` |
| JS lint | `npm run lint` |
| CSS lint | `npm run stylelint` |
| All static checks | `npm run check` |
| Full verify (CI-style) | `npm run check:all` |

Other commands:

```bash
npm start              # Dev server (alias for npm run dev)
npm run dev              # Dev server (regenerates preset manifest first)
npm run build            # Production build → dist/
npm run preview          # Preview production build
npm run test:watch       # Vitest watch mode
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier write
npm run test:visual      # Playwright visual regression
npm run test:visual:update  # Update visual snapshots
```

Production builds run preset manifest generation, Vite build, and Brotli compression. Output goes to `dist/`.

## Code standards

- **JavaScript**: ESM only (`import` / `export`). Never introduce `require()` or CommonJS.
- **Small diffs**: Prefer minimal, focused changes. Avoid sweeping refactors unless asked.
- **No hidden work**: Do not add unrelated features while fixing a bug or security issue.
- **Docs**: If behavior changes or a new command/config is added, update `README.md` or relevant docs.
- **Naming**: Lowercase files with hyphens (e.g. `my-fractal.js`).
- **Comments**: Explain *why*, not *what*. Add JSDoc for public APIs.

## Security and dependencies

- **Never** commit secrets or credentials. Treat `.env*`, API keys, tokens, and private URLs as sensitive.
- **Prefer upstream fixes**: Upgrade the direct dependency to a patched version first.
- **`overrides`**: Use only when necessary for transitive fixes; document the reason in the PR/commit message. Pin to a **patched** version (no ranges). Avoid overriding to a different major unless it is the only viable fix and the app still builds/tests.
- **After dependency changes**: Run `npm audit` and ensure it is clean (or explain remaining advisories and risk).
- **Dev server exposure**: If network exposure is required, constrain filesystem access and configure `server.fs` intentionally.

## Performance guardrails

This app has animation/render hot paths. Keep these in mind:

- **Bundle splitting**: Avoid complex `manualChunks` that can create circular chunk graphs. Prefer stable, coarse splits: `vendor-*`, `synaptic`, and a single `app` chunk unless profiling shows otherwise.
- **Runtime hot paths**: Avoid allocations in animation/render loops. Prefer cached lookups and preallocated typed arrays where practical.
- **Async loading**: Use `import()` for truly optional features; do not mix static and dynamic imports for the same module unless intentional.
- **Diagnostics**: When performance is mentioned, measure first (build output, runtime timings, or a reproducible scenario).

Feature flags live in `static/js/core/config.js` under `CONFIG.features`. Restart dev server or rebuild after changing them.

## Testing instructions

- **Fix the root cause**: Do not paper over failing tests by loosening assertions unless the requirement truly changed.
- **Unit tests**: Vitest with jsdom. Prefer deterministic tests (no uncontrolled time/network/randomness). For browser APIs (`localStorage`, `fullscreen`, `canvas`), use explicit mocks/stubs.
- **Coverage**: The project targets high coverage thresholds; add or update tests for behavior you change.
- **Focus a test**: `npx vitest run -t "<test name>"`
- **Visual regression**: Run `npm run test:visual` after rendering or fractal changes. Update snapshots with `npm run test:visual:update` only when the visual change is intentional.
- **Lint/style**: Keep ESLint and Stylelint happy for edited files. Prefer running the formatter over manual whitespace edits.

Before finishing a task, ensure relevant tests and lint checks pass.

## Pull requests and commits

- **Branch names**: `feature/…`, `fix/…`, `docs/…`, `perf/…` (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Commits**: Clear, descriptive messages focused on *why*. Only create commits when the user explicitly asks.
- **PRs**: Include what changed and why; add screenshots/recordings for visual changes. Run `npm run check` (or `npm run check:all` for broader changes) before opening.
- **Deployment**: Cloudflare Pages builds with `npm run build`; output directory `dist/`. Do not use `npm install && npm run build` in Pages config (install runs separately).

## Adding fractals

When adding a new fractal:

1. Implement under `static/js/fractals/2d/` in the appropriate family folder.
2. Register it in the fractal loader/config (`static/js/fractals/loader.js`, `fractal-config.js`).
3. Support color schemes from `static/js/fractals/utils.js`.
4. Handle zoom, pan, and scaling parameters correctly.
5. Add unit tests; consider visual snapshot coverage for rendering changes.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed fractal implementation guidelines.

## Nested AGENTS.md files

The closest `AGENTS.md` to edited files takes precedence over this root file.

| Path | Scope |
| --- | --- |
| [tests/AGENTS.md](tests/AGENTS.md) | Vitest unit tests, Playwright visual regression, coverage |
| [static/js/AGENTS.md](static/js/AGENTS.md) | Application modules, fractals, rendering, performance |

## Related documentation

- [README.md](README.md) — features, deployment, feature flags, project structure
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow and fractal guidelines
- [`.cursor/rules/`](.cursor/rules/) — Cursor rule files (source for the standards above)
