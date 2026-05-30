# AGENTS.md — static/js/

Instructions for AI coding agents working in application source. Repo-wide standards live in [../../AGENTS.md](../../AGENTS.md).

## Entry and boot flow

- **HTML entry**: `index.html` loads `static/js/core/initialization.js` as the sole module script.
- **Initialization**: `core/initialization.js` wires canvas, rendering engine, UI, input, sharing, workers, and feature detection.
- **State**: `core/app-state.js` holds runtime state; prefer reading/writing through existing managers rather than new globals.
- **Config / feature flags**: `core/config.js` — restart dev server or rebuild after changing `CONFIG.features`.

## Module layout

| Directory | Role |
| --- | --- |
| `core/` | App state, config, init, lifecycle, logging, DOM cache |
| `rendering/` | WebGL/regl engine, tiles, adaptive quality, GPU timers, context loss |
| `fractals/` | Loader, config, utils; implementations in `fractals/2d/` |
| `fractals/2d/families/` | Family chunk modules for code splitting |
| `ui/` | Controls, panels, presets, discovery UI |
| `input/` | Pan, zoom, touch, keyboard |
| `discovery/` | ML scoring, favorites, "Surprise Me" |
| `sharing/` | URL encode/decode, share state |
| `export/` | Screenshot metadata, video encoding |
| `workers/` | Worker pool, tile protocol, feature detection |
| `performance/` | FPS, benchmarks, instrumentation, long-task detection |

Styles live in `static/css/styles.css` (not under `static/js/`).

## Code conventions

- **ESM only** — `import` / `export`; never `require()` or CommonJS.
- **Naming** — lowercase files with hyphens (`my-fractal.js`).
- **Comments** — explain *why*; JSDoc for public APIs.
- **Small diffs** — match surrounding patterns; avoid drive-by refactors.

## Performance (critical)

This codebase has render-loop hot paths. Follow these when touching rendering, workers, or animation:

- No allocations inside per-frame loops; cache lookups and reuse typed arrays where practical.
- Measure before optimizing (build output, FPS, benchmark UI, or `performance/test-runner.js`).
- **Bundle splitting**: family chunks via `fractals/loader.js` (`FRACTAL_FAMILIES`). Avoid complex `manualChunks` in `vite.config.js` that create circular chunk graphs. Prefer coarse splits: `vendor-*`, `synaptic`, `app`.
- **Dynamic imports**: use `import()` for optional features; do not mix static and dynamic imports for the same module unless intentional.

## Adding or changing fractals

1. Implement under `fractals/2d/` (or the appropriate `families/*-family.js` chunk).
2. Register the type in `fractals/loader.js` (`FRACTAL_FAMILIES`) and `fractals/fractal-config.js`.
3. Support color schemes from `fractals/utils.js`.
4. Handle zoom, pan, and scale parameters consistently with sibling fractals.
5. Add unit tests in `tests/unit/` (naming: `fractals-*` or module-path with hyphens).
6. Run visual regression if pixel output changes: `npm run test:visual`.

### Implementation patterns

- **Escape-time / shader fractals** (Mandelbrot, Julia): fragment shaders via regl.
- **Iterative / geometric fractals** (Koch, Sierpinski): geometry generation.
- Aim for smooth interaction (~60 FPS at default settings).

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for full fractal guidelines.

## Rendering changes

Key modules: `rendering/engine.js`, `rendering/canvas-renderer.js`, `rendering/tile-renderer.js`.

- WebGL capability detection: `rendering/webgl-capabilities.js`
- Experimental backends (WebGPU, compute): behind flags in `core/config.js`; default off
- Context loss: `rendering/context-loss-handler.js` — preserve recovery behavior when editing GL resources

After rendering changes, run unit tests **and** `npm run test:visual`.

## Testing expectations

- Coverage targets 100% on `static/js/**/*.js` — new branches need tests.
- `tests/unit/all-modules-import.test.js` imports every file here; modules must load cleanly.
- Mock browser APIs in tests (`localStorage`, `canvas`, WebGL) — see [../../tests/AGENTS.md](../../tests/AGENTS.md).

## Verification

| Change type | Command |
| --- | --- |
| Logic / modules | `npm run test:unit` |
| Build / imports / Vite | `npm run build` |
| Rendering / appearance | `npm run test:visual` |
| JS style | `npm run lint` |
