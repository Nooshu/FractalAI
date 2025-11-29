/**
 * Performance benchmarking utilities for fractal rendering
 * Measures FPS, frame times, and shader execution performance
 */

export class PerformanceBenchmark {
  constructor() {
    this.isRunning = false;
    this.startTime = 0;
    this.frameTimes = [];
    this.frameCount = 0;
    this.samples = [];
    this.maxSamples = 300; // ~5 seconds at 60fps
    this.onComplete = null;
  }

  /**
   * Start benchmarking
   * @param {number} duration - Duration in milliseconds (default: 5000ms)
   * @param {Function} onComplete - Callback when benchmark completes
   */
  start(duration = 5000, onComplete = null) {
    if (this.isRunning) {
      console.warn('Benchmark already running');
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.frameTimes = [];
    this.frameCount = 0;
    this.samples = [];
    this.onComplete = onComplete;
    this.duration = duration;

    // Reset for new benchmark
    this.lastFrameTime = performance.now();
    this.measureFrame();
  }

  /**
   * Measure a single frame
   */
  measureFrame() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.frameTimes.push(frameTime);
    this.frameCount++;

    // Calculate current stats
    const elapsed = currentTime - this.startTime;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avgFrameTime;

    this.samples.push({
      time: elapsed,
      frameTime,
      fps,
      frameCount: this.frameCount,
    });

    // Keep only recent samples
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
      this.samples.shift();
    }

    // Check if benchmark should complete
    if (elapsed >= this.duration) {
      this.stop();
      return;
    }

    requestAnimationFrame(() => this.measureFrame());
  }

  /**
   * Stop benchmarking
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    const results = this.getResults();
    if (this.onComplete) {
      this.onComplete(results);
    }

    return results;
  }

  /**
   * Get current benchmark results
   */
  getResults() {
    if (this.frameTimes.length === 0) {
      return null;
    }

    const sortedFrameTimes = [...this.frameTimes].sort((a, b) => a - b);
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    const avg = sum / this.frameTimes.length;
    const min = sortedFrameTimes[0];
    const max = sortedFrameTimes[sortedFrameTimes.length - 1];

    // Calculate percentiles
    const p50 = this.percentile(sortedFrameTimes, 50);
    const p95 = this.percentile(sortedFrameTimes, 95);
    const p99 = this.percentile(sortedFrameTimes, 99);

    return {
      duration: performance.now() - this.startTime,
      frameCount: this.frameCount,
      avgFrameTime: avg,
      minFrameTime: min,
      maxFrameTime: max,
      p50FrameTime: p50,
      p95FrameTime: p95,
      p99FrameTime: p99,
      avgFPS: 1000 / avg,
      minFPS: 1000 / max,
      maxFPS: 1000 / min,
      samples: this.samples,
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, percentile) {
    const index = Math.ceil((sortedArray.length * percentile) / 100) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

/**
 * WebGL timing extension for precise shader measurement
 */
export class WebGLTiming {
  constructor(gl) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.queries = [];
    this.activeQuery = null;
  }

  /**
   * Check if timing is supported
   */
  isSupported() {
    return this.ext !== null;
  }

  /**
   * Start timing a draw call
   */
  beginQuery() {
    if (!this.isSupported()) return null;

    const query = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.activeQuery = query;
    return query;
  }

  /**
   * End timing a draw call
   */
  endQuery() {
    if (!this.isSupported() || !this.activeQuery) return null;

    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    const query = this.activeQuery;
    this.activeQuery = null;
    this.queries.push(query);
    return query;
  }

  /**
   * Get completed query results
   * @returns {Array<number>} Array of timings in nanoseconds
   */
  getResults() {
    if (!this.isSupported()) return [];

    const results = [];
    const available = this.queries.filter((query) => {
      const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
      const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

      if (available && !disjoint) {
        const timeElapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
        results.push(timeElapsed / 1000000); // Convert to milliseconds
        return false; // Remove from queries
      }
      return true; // Keep in queries
    });

    this.queries = available;
    return results;
  }

  /**
   * Clear all queries
   */
  clear() {
    this.queries.forEach((query) => this.gl.deleteQuery(query));
    this.queries = [];
  }
}

/**
 * Comprehensive benchmark suite
 */
export class BenchmarkSuite {
  constructor(regl, canvas, loadFractal, setParams) {
    this.regl = regl;
    this.canvas = canvas;
    this.loadFractal = loadFractal;
    this.setParams = setParams;
    this.results = [];
    this.webglTiming = regl ? new WebGLTiming(regl._gl) : null;
  }

  /**
   * Run a single benchmark
   * @param {Object} config - Benchmark configuration
   * @returns {Promise<Object>} Benchmark results
   */
  async runBenchmark(config) {
    const {
      fractalType,
      iterations = 125,
      zoom = 1,
      duration = 5000,
      colorScheme = 'classic',
    } = config;

    // Load fractal
    await this.loadFractal(fractalType);

    // Set parameters
    this.setParams({
      iterations,
      zoom,
      colorScheme,
      offset: { x: 0, y: 0 },
      xScale: 1.0,
      yScale: 1.0,
    });

    // Wait for render to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clear WebGL timing queries
    if (this.webglTiming) {
      this.webglTiming.clear();
    }

    // Run benchmark
    const benchmark = new PerformanceBenchmark();
    const results = await new Promise((resolve) => {
      benchmark.start(duration, resolve);
    });

    // Get WebGL timing results if available
    let gpuTimings = [];
    if (this.webglTiming && this.webglTiming.isSupported()) {
      // Wait a bit for queries to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      gpuTimings = this.webglTiming.getResults();
    }

    const fullResults = {
      ...results,
      config,
      gpuTimings:
        gpuTimings.length > 0
          ? {
              avg: gpuTimings.reduce((a, b) => a + b, 0) / gpuTimings.length,
              min: Math.min(...gpuTimings),
              max: Math.max(...gpuTimings),
              samples: gpuTimings,
            }
          : null,
    };

    this.results.push(fullResults);
    return fullResults;
  }

  /**
   * Run a suite of benchmarks
   * @param {Array<Object>} configs - Array of benchmark configurations
   * @returns {Promise<Array<Object>>} All benchmark results
   */
  async runSuite(configs) {
    this.results = [];

    for (const config of configs) {
      await this.runBenchmark(config);
      // Small delay between benchmarks
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return this.results;
  }

  /**
   * Generate a comparison report
   * @param {Array<Object>} baselineResults - Baseline benchmark results
   * @param {Array<Object>} optimizedResults - Optimized benchmark results
   * @returns {Object} Comparison report
   */
  static compareResults(baselineResults, optimizedResults) {
    const comparison = {
      tests: [],
      summary: {
        avgFPSImprovement: 0,
        avgFrameTimeImprovement: 0,
        totalTests: 0,
      },
    };

    // Match results by config
    const baselineMap = new Map();
    baselineResults.forEach((r) => {
      const key = `${r.config.fractalType}_${r.config.iterations}_${r.config.zoom}`;
      baselineMap.set(key, r);
    });

    optimizedResults.forEach((opt) => {
      const key = `${opt.config.fractalType}_${opt.config.iterations}_${opt.config.zoom}`;
      const baseline = baselineMap.get(key);

      if (baseline) {
        const fpsImprovement = ((opt.avgFPS - baseline.avgFPS) / baseline.avgFPS) * 100;
        const frameTimeImprovement =
          ((baseline.avgFrameTime - opt.avgFrameTime) / baseline.avgFrameTime) * 100;

        comparison.tests.push({
          config: opt.config,
          baseline: {
            avgFPS: baseline.avgFPS,
            avgFrameTime: baseline.avgFrameTime,
          },
          optimized: {
            avgFPS: opt.avgFPS,
            avgFrameTime: opt.avgFrameTime,
          },
          improvement: {
            fps: fpsImprovement,
            frameTime: frameTimeImprovement,
          },
        });

        comparison.summary.avgFPSImprovement += fpsImprovement;
        comparison.summary.avgFrameTimeImprovement += frameTimeImprovement;
        comparison.summary.totalTests++;
      }
    });

    if (comparison.summary.totalTests > 0) {
      comparison.summary.avgFPSImprovement /= comparison.summary.totalTests;
      comparison.summary.avgFrameTimeImprovement /= comparison.summary.totalTests;
    }

    return comparison;
  }

  /**
   * Export results as JSON
   */
  exportResults() {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Format results as a readable report
   */
  formatReport() {
    if (this.results.length === 0) {
      return 'No benchmark results available.';
    }

    let report = '\n=== Benchmark Results ===\n\n';

    this.results.forEach((result, index) => {
      const { config, avgFPS, avgFrameTime, p95FrameTime, gpuTimings } = result;

      report += `Test ${index + 1}: ${config.fractalType}\n`;
      report += `  Iterations: ${config.iterations}, Zoom: ${config.zoom}\n`;
      report += `  Avg FPS: ${avgFPS.toFixed(2)}\n`;
      report += `  Avg Frame Time: ${avgFrameTime.toFixed(2)}ms\n`;
      report += `  P95 Frame Time: ${p95FrameTime.toFixed(2)}ms\n`;

      if (gpuTimings) {
        report += `  GPU Time (avg): ${gpuTimings.avg.toFixed(2)}ms\n`;
      }

      report += '\n';
    });

    // Summary
    const avgFPS = this.results.reduce((sum, r) => sum + r.avgFPS, 0) / this.results.length;
    const avgFrameTime =
      this.results.reduce((sum, r) => sum + r.avgFrameTime, 0) / this.results.length;

    report += `Summary:\n`;
    report += `  Average FPS: ${avgFPS.toFixed(2)}\n`;
    report += `  Average Frame Time: ${avgFrameTime.toFixed(2)}ms\n`;

    return report;
  }
}
