High‑value extras before WebGL/rendering work
These are things I’d consider “worth doing first” that build on your current plan and focus on CPU, architecture, and runtime behavior.

1. Startup & bundle‑level optimisations

Code splitting by fractal family
Load static/js/fractals/2d/* modules on demand via dynamic import rather than eagerly loading all 81 fractals.
Defer loading of rarely used panels / debug UI until first open.
Lean critical path for first render
Audit core/initialization.js, core/app-state.js, and rendering/engine.js to ensure first visible fractal requires:
Minimal config parsing.
One fractal module.
One renderer backend.
Push everything else (sharing, performance UI, advanced controls) behind requestIdleCallback or a “background init” phase.
Tree‑shaking and build tuning
Ensure Vite/Rollup is fully tree‑shaking fractal utilities and any third‑party deps.
Prefer small, hand‑rolled helpers over generic utility libs in hot paths.

2. Hot‑loop micro‑optimisations in JS

Allocation‑free inner loops
In each fractal’s iteration loop, avoid:
Creating new objects/arrays per pixel.
Closures capturing large outer scopes.
Pre‑allocate scratch arrays/typed arrays and reuse them across frames.
Shape‑stable state objects
Keep state.js and per‑fractal state objects monomorphic:
Initialize all fields up front.
Avoid adding/removing properties at runtime.
This helps JITs keep tight loops well‑optimized.
Fast math helpers
Inline tiny math helpers used per‑pixel (or mark them as pure and simple) to encourage inlining.
Replace generic Math.pow with explicit multiplications (e.g. x*x or x*x*x) in inner loops.

3. Interaction & main‑thread noise reduction

Input throttling/debouncing
Throttle wheel/zoom/pan handlers (in input/controls.js and ui/controls.js) to at most one “recompute” per animation frame.
Use a small “dead‑band” for continuous input: minor mouse movements don’t trigger a full recompute.
Event batching
When multiple controls change quickly (e.g. dragging sliders), accumulate changes into a single “apply changes” step per frame using requestAnimationFrame.
Pointer events & passive listeners
Use pointer events instead of separate mouse/touch where possible, and mark scroll/touch listeners as { passive: true } to avoid layout stalls.

4. Color mapping & palette efficiency

Precomputed colour lookup tables
For a given palette and max iterations, precompute a Uint32Array (or Uint8ClampedArray) of RGBA values indexed by iteration count or normalized escape time.
In the hot loop, map iteration -> colorIndex with simple arithmetic and one table lookup.
Separate color stage from iteration
Let workers compute only scalar fields (iteration counts / distance estimates).
Apply color mapping in a second, easy‑to‑optimize pass that can be switched or re‑applied without recomputing iterations.

5. Precision/quality modes (CPU‑side)

Dynamic quality scaling pre‑GPU
Before WebGL/WebGPU, use CPU‑only heuristics:
Lower resolution (render at e.g. 0.75x scale and upscale) when FPS drops below a target.
Reduce iteration caps in distant zoom levels or low‑detail regions.
Device‑aware defaults
Use basic navigator.hardwareConcurrency, devicePixelRatio, and simple timing probes at startup to choose a default “profile” (e.g. Low/Medium/High) even in the pure‑CPU renderer.

6. Instrumentation & observability

Lightweight perf counters in hot paths
Add opt‑in instrumentation (guarded by a flag) inside core loops: iteration counts, tile times, number of rerenders triggered by the UI.
Expose these to ui/debug-display.js so you can see if work is being wasted (e.g. too many invalidations).
Long task detection
Use PerformanceObserver for longtask (where supported) to identify unexpected blocking operations (logging, DOM updates, or non‑critical work) still happening on the main thread during heavy computation.

7. Worker design (before GPU, but aligned with future paths)

API shape compatible with future GPU backend
Design the worker message protocol around “tile requests” and “scalar fields + metadata” responses, not canvas specifics.
That same protocol can later feed WebGL/WebGPU textures instead of CPU putImageData.
Graceful degradation for low‑core devices
Implement an adaptive worker pool: start with min(4, hardwareConcurrency - 1) workers; shrink if overhead outweighs benefits (using simple timing feedback).

8. Resource hygiene & lifecycle

Explicit lifecycle for fractal sessions
When switching fractal types, zoom presets, or routes, explicitly:
Cancel in‑flight workers.
Clear caches for obsolete fractal configs.
Release references to large typed arrays.
This avoids lingering memory pressure that can later slow everything down.
Idle cleanup
Use requestIdleCallback for low‑priority cache trimming and data structure compaction so that long sessions don’t accumulate cruft.

How to sequence this before WebGL

Pass 1: Startup path & bundle slimming (lazy load fractals, minimal first render).
Pass 2: Inner‑loop micro‑optimisations (allocations, math, object shapes, palettes).
Pass 3: Interaction/input throttling and main‑thread noise cleanup.
Pass 4: Worker API design that’s GPU‑ready, with adaptive worker counts.
Pass 5: Instrumentation, long‑task detection, and lifecycle/cleanup hygiene.

If you’d like, I can pick one of these passes (e.g. startup/bundle or hot‑loop micro‑optimisations) and draft concrete code‑level changes for the existing modules.

# Fractal Performance & Browser API Optimization Plan

### Goals

- **Maximize fractal generation and rendering performance** across modern browsers.
- **Exploit parallelism and hardware acceleration** (GPU, multiple CPU cores, vectorization).
- **Reduce main-thread work and jank**, keeping UI responsive at high resolutions.
- **Maintain or extend the existing test harness** (unit, visual, performance tests).
- **Optionally leverage experimental APIs with feature detection**, falling back gracefully.

---

### 1. Baseline Profiling & Targets

- **1.1 Establish performance baselines**
- Use browser Performance panel to profile initial load, first render, zoom/pan interactions for several representative fractals (simple, heavy, animated).
- Capture metrics: time to first visible fractal, steady-state FPS, frame per render, GC pressure, and memory footprint.
- **1.2 Wire perf metrics into existing tooling**
- Ensure `performance/benchmark.js`, `fps-tracker.js`, and `test-runner.js` can log standard metrics (e.g., in `test-results/results.json`) for automated comparison.
- **1.3 Define target budgets**
- Example: 
  - 60 FPS at 1080p for mid-cost fractals on mid-range laptop.
  - 30 FPS for high-cost fractals at 4K with progressive refinement.

---

### 2. Algorithmic & Math-Level Optimizations

- **2.1 Review iteration and escape logic**
- Inspect representative 2D fractal modules under `static/js/fractals/2d/` for:
  - Avoidable branches inside tight loops.
  - Repeated calculations (e.g., powers, constants, complex multiplications) that can be hoisted or cached.
- **2.2 Optimize precision and data types**
- Evaluate where `Float32` is sufficient vs `Float64`.
- For GPU or SIMD, reorganize data as SoA (structure-of-arrays) where beneficial.
- **2.3 Adaptive iteration and sampling**
- Introduce adaptive iteration depths based on zoom level and region.
- Early-out regions known to be inside set (e.g., Mandelbrot cardioid/bulb tests) where not already used.
- **2.4 Caching and memoization across frames**
- Use or extend `rendering/cache.js` and `core/frameCache.js` to reuse partially computed tiles when panning/zooming slightly.

---

### 3. Parallelism with Web Workers & Off-main-thread Rendering

- **3.1 Worker-based compute pipeline**
- Introduce or extend a dedicated worker pool for fractal iteration using `Worker` or `SharedWorker`.
- Partition the canvas into tiles; distribute work to workers, aggregate results.
- **3.2 Transfer optimizations**
- Use `Transferable` objects and `SharedArrayBuffer` (with COOP/COEP headers already in `_headers` / `dist/_headers` if applicable) to minimize copy overhead.
- Represent pixel data as `Uint8ClampedArray` or `Uint32Array` backing an `ImageData` or GPU buffer.
- **3.3 OffscreenCanvas for rendering in workers**
- When supported, use `OffscreenCanvas` inside workers for rasterization, then transfer to main-thread canvas.
- Fallback: workers compute raw pixel buffers, main thread blits with `putImageData` or WebGL.

---

### 4. GPU Acceleration (WebGL2 / WebGPU)

- **4.1 Abstract rendering backend**
- Introduce a renderer abstraction in `rendering/renderer.js` or similar that can switch between:
  - CPU canvas 2D.
  - WebGL2 fragment-shader-based fractal rendering.
  - Experimental WebGPU backend where available.
- **4.2 WebGL2 path**
- Implement GLSL fragment shaders encoding fractal iteration for main families.
- Send per-frame uniforms (viewport, zoom, iteration caps, color maps) from `engine.js`.
- Use full-screen triangle or quad, with the GPU computing per-pixel escape times.
- **4.3 WebGPU experimental path**
- With feature detection (`navigator.gpu`):
  - Implement compute shaders for fractal iteration, writing into storage textures.
  - Benchmark vs WebGL2 and CPU paths.
- Provide clear fallback to WebGL2/2D canvas when unavailable.

---

### 5. SIMD & Typed Array Optimizations

- **5.1 Typed array organization**
- Standardize internal data structures (`state.js`, `fractal-config.js`, `rendering/cache.js`) to use typed arrays for large numeric grids.
- **5.2 SIMD via WebAssembly or JS SIMD (where available)**
- Evaluate compiling core iteration loops to WebAssembly with SIMD (e.g., via a tiny Rust/C module) if feasible for this project.
- Alternatively, structure loops for JS engines to auto-vectorize:
  - Straight-line code, no hidden types, no object shapes inside hot loops.

---

### 6. Scheduling, Progressive Rendering, and Responsiveness

- **6.1 Refine progressive rendering strategy**
- Use `rendering/progressive.js` and `engine.js` to:
  - Render low-res or sparse samples first, then refine tiles.
  - Prioritize tiles near the viewport center or pointer.
- **6.2 Use modern scheduling APIs**
- Where available, leverage:
  - `requestIdleCallback` (with sensible timeouts) to schedule non-critical work.
  - `scheduler.postTask` (when supported) for prioritizing user-visible work.
- **6.3 Align with refresh rate**
- Use `requestAnimationFrame` for all visual updates.
- Batch state updates between frames to avoid layout thrash.

---

### 7. Memory & Cache Management

- **7.1 Frame and tile cache tuning**
- Extend `core/frameCache.js` and `rendering/cache.js` with size limits and LRU-style eviction.
- Use heuristics based on zoom history and viewport movement.
- **7.2 Avoid leaks and long-lived closures**
- Audit event listeners and subscriptions in `core/app-state.js`, `rendering/engine.js`, `ui/controls.js` so that old workers and buffers are released when changing fractal types or resetting.
- **7.3 Binary data formats for sharing & saving**
- Where `sharing/encoder.js` and `decoder.js` currently use JSON or text, consider compact binary layouts for large shareable states if those become a bottleneck.

---

### 8. Modern & Experimental Browser APIs (Feature-flagged)

- **8.1 OffscreenCanvas, WebGPU, and SharedArrayBuffer**
- Implement robust feature detection and capability flags in `core/config.js` or a new `core/capabilities.js` module.
- Use COOP/COEP headers to enable `SharedArrayBuffer` in secure contexts when hosting.
- **8.2 Fenced performance optimizations**
- Explore `performance.measureUserAgentSpecificMemory` (where available) to adapt quality based on memory pressure.
- **8.3 Future-facing ideas**
- Prepare hooks for:
  - `AnimationWorklet` / `Worklet`-based animation if standardized further.
  - `WebAssembly` GC and tail-call features that may aid multi-language integration.

---

### 9. Testing & Regression Protection

- **9.1 Extend performance tests**
- Use and extend `tests/unit/performance-benchmark.test.js`, `fps-tracker.test.js`, and `performance-test-runner-ui.test.js` to guard against regressions.
- Add thresholds or comparative checks (e.g., new version must not be >10% slower on baseline scenes).
- **9.2 Visual correctness**
- Ensure GPU and CPU paths produce visually equivalent outputs by reusing `tests/visual/fractal-visual.test.js` and snapshot comparisons.
- **9.3 Cross-browser matrix**
- Define a minimum browser matrix (e.g., latest Chrome, Firefox, Safari, Edge) and ensure fallbacks work correctly.

---

### 10. Developer Experience & Configuration

- **10.1 Capability- and quality-level presets**
- Introduce user-tunable performance modes (e.g., "Battery Saver", "Balanced", "Ultra Detail") that map to iteration caps, resolution scaling, and backend selection.
- **10.2 Diagnostics UI**
- Extend `ui/debug-display.js` and `ui/coordinate-display.js` with real-time FPS, tile completion status, backend indicator (CPU/WebGL/WebGPU), and worker count.
- **10.3 Documentation**
- Update `README.md`, `VISUAL_TESTING_SETUP.md`, and `MAINTAINABILITY_PLAN.md` with:
  - New backends and feature flags.
  - How to run performance benchmarks.
  - How to enable experimental APIs during development.

---

### Implementation Strategy

- **Phase 1**: Baseline profiling, algorithmic optimizations, and small math-level wins.
- **Phase 2**: Worker-based parallelism and OffscreenCanvas integration.
- **Phase 3**: WebGL2 renderer, then optional WebGPU backend behind feature detection.
- **Phase 4**: Memory/cache tuning, scheduling improvements, and experimental APIs.
- **Phase 5**: Harden tests, finalize docs, and tune presets based on real-world measurements.
