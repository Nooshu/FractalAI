# Performance Benchmarking System

A comprehensive performance testing framework for measuring fractal rendering performance and validating optimization improvements.

## Features

- **Frame Time Measurement**: Precise frame-by-frame timing
- **FPS Calculation**: Average, min, max FPS tracking
- **Percentile Analysis**: P50, P95, P99 frame time percentiles
- **WebGL Timing**: GPU shader execution time (when supported)
- **Comparison Tools**: Compare baseline vs optimized results
- **Export Results**: JSON export for further analysis

## Usage

### Via UI

1. Click the **Benchmark** button in the top action bar
2. Select a test suite:
   - **Quick**: 2 tests (~10 seconds) - Fast validation
   - **Standard**: 5 tests (~25 seconds) - Balanced testing
   - **Comprehensive**: 13 tests (~65 seconds) - Thorough analysis
   - **Mandelbrot Deep Dive**: 8 tests (~40 seconds) - Single fractal analysis
3. Adjust duration per test (default: 3000ms)
4. Click **Run Benchmark**
5. View results in the panel
6. Export results as JSON for comparison

### Programmatic Usage

```javascript
import { TestRunner, DEFAULT_TEST_SUITES } from './performance/test-runner.js';

// Initialize
const runner = new TestRunner(regl, canvas, loadFractal, setParams);

// Run a predefined suite
const results = await runner.run('standard', { duration: 3000 });

// Run custom tests
const customTests = [
  { fractalType: 'mandelbrot', iterations: 125, zoom: 1 },
  { fractalType: 'julia', iterations: 250, zoom: 10 },
];
const results = await runner.run(customTests, { duration: 5000 });

// Compare results
const comparison = runner.compare(baselineResults, optimizedResults);
console.log(runner.formatComparison(comparison));
```

## Results Format

```javascript
{
  duration: 5000,           // Total benchmark duration (ms)
  frameCount: 300,          // Number of frames measured
  avgFrameTime: 16.67,      // Average frame time (ms)
  minFrameTime: 12.5,       // Minimum frame time (ms)
  maxFrameTime: 25.0,       // Maximum frame time (ms)
  p50FrameTime: 16.0,       // 50th percentile (median)
  p95FrameTime: 20.0,       // 95th percentile
  p99FrameTime: 22.0,       // 99th percentile
  avgFPS: 60.0,             // Average FPS
  minFPS: 40.0,             // Minimum FPS
  maxFPS: 80.0,             // Maximum FPS
  gpuTimings: {             // GPU timing (if supported)
    avg: 8.5,
    min: 6.2,
    max: 12.1,
    samples: [8.1, 8.3, 8.7, ...]
  },
  config: {                 // Test configuration
    fractalType: 'mandelbrot',
    iterations: 125,
    zoom: 1
  }
}
```

## Comparing Results

### Before/After Optimization

1. Run benchmark before optimization → Export as `baseline.json`
2. Apply optimization
3. Run benchmark after optimization → Export as `optimized.json`
4. Load both JSON files and compare:

```javascript
const baseline = JSON.parse(baselineJson);
const optimized = JSON.parse(optimizedJson);

const comparison = runner.compare(baseline, optimized);
console.log(runner.formatComparison(comparison));
```

### Comparison Output

```
=== Performance Comparison ===

Test 1: mandelbrot
  Config: 125 iter, zoom 1
  Baseline:  45.23 FPS (22.11ms)
  Optimized: 52.18 FPS (19.16ms)
  Improvement: +15.36% FPS, +13.34% frame time

Summary:
  Average FPS Improvement: +12.45%
  Average Frame Time Improvement: +11.08%
```

## Best Practices

1. **Consistent Environment**: Run benchmarks on the same hardware/browser
2. **Close Other Applications**: Minimize background processes
3. **Warm-up**: Let the app run for a few seconds before benchmarking
4. **Multiple Runs**: Run benchmarks 3-5 times and average results
5. **Document Conditions**: Note browser version, GPU, OS in results

## WebGL Timing

GPU timing requires WebGL2 with `EXT_disjoint_timer_query_webgl2` extension. If not available, benchmarks will still run but without GPU timing data.

## Test Suites

### Quick Suite
- Fast validation (2 tests)
- Good for development iterations
- ~10 seconds total

### Standard Suite
- Balanced coverage (5 tests)
- Recommended for most use cases
- ~25 seconds total

### Comprehensive Suite
- Thorough analysis (13 tests)
- Multiple fractals, iterations, zoom levels
- ~65 seconds total

### Mandelbrot Deep Dive
- Single fractal, multiple configurations
- Tests iterations (50-500) and zoom (1-1000)
- ~40 seconds total

## API Reference

### `PerformanceBenchmark`

Core benchmarking class for frame-by-frame measurement.

```javascript
const benchmark = new PerformanceBenchmark();
benchmark.start(5000, (results) => {
  console.log('Benchmark complete:', results);
});
```

### `WebGLTiming`

WebGL timing extension wrapper for GPU measurements.

```javascript
const timing = new WebGLTiming(gl);
if (timing.isSupported()) {
  timing.beginQuery();
  // ... draw calls ...
  timing.endQuery();
  const gpuTime = timing.getResults();
}
```

### `BenchmarkSuite`

Suite runner for multiple benchmark configurations.

```javascript
const suite = new BenchmarkSuite(regl, canvas, loadFractal, setParams);
const results = await suite.runSuite(configs);
```

### `TestRunner`

High-level test runner with predefined suites.

```javascript
const runner = new TestRunner(regl, canvas, loadFractal, setParams);
const results = await runner.run('standard');
```

