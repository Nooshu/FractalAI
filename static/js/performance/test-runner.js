/**
 * Automated test runner for performance benchmarks
 * Provides predefined test suites and easy-to-use API
 */

import { BenchmarkSuite } from './benchmark.js';

/**
 * Default test configurations
 */
export const DEFAULT_TEST_SUITES = {
  // Quick test suite (fast, for development)
  quick: [
    { fractalType: 'mandelbrot', iterations: 50, zoom: 1 },
    { fractalType: 'julia', iterations: 50, zoom: 1 },
  ],

  // Standard test suite (balanced)
  standard: [
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1 },
    { fractalType: 'julia', iterations: 125, zoom: 1 },
    { fractalType: 'burning-ship', iterations: 125, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 250, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 10 },
  ],

  // Comprehensive test suite (thorough, takes longer)
  comprehensive: [
    // Low iterations
    { fractalType: 'mandelbrot', iterations: 50, zoom: 1 },
    { fractalType: 'julia', iterations: 50, zoom: 1 },
    { fractalType: 'burning-ship', iterations: 50, zoom: 1 },

    // Medium iterations
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1 },
    { fractalType: 'julia', iterations: 125, zoom: 1 },
    { fractalType: 'burning-ship', iterations: 125, zoom: 1 },
    { fractalType: 'multibrot', iterations: 125, zoom: 1 },
    { fractalType: 'newton', iterations: 125, zoom: 1 },

    // High iterations
    { fractalType: 'mandelbrot', iterations: 250, zoom: 1 },
    { fractalType: 'julia', iterations: 250, zoom: 1 },

    // Different zoom levels
    { fractalType: 'mandelbrot', iterations: 125, zoom: 10 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 100 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1000 },
  ],

  // Single fractal deep dive
  mandelbrot: [
    { fractalType: 'mandelbrot', iterations: 50, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 250, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 500, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 10 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 100 },
    { fractalType: 'mandelbrot', iterations: 125, zoom: 1000 },
  ],
};

/**
 * Test runner class
 */
export class TestRunner {
  constructor(regl, canvas, loadFractal, setParams) {
    this.suite = new BenchmarkSuite(regl, canvas, loadFractal, setParams);
    this.isRunning = false;
    this.progressCallback = null;
  }

  /**
   * Run a test suite
   * @param {string|Array} suiteName - Name of predefined suite or array of configs
   * @param {Object} options - Options { duration, onProgress }
   * @returns {Promise<Object>} Results
   */
  async run(suiteName, options = {}) {
    if (this.isRunning) {
      throw new Error('Test runner is already running');
    }

    this.isRunning = true;
    const { duration = 3000, onProgress } = options;
    this.progressCallback = onProgress;

    let configs;
    if (typeof suiteName === 'string') {
      configs = DEFAULT_TEST_SUITES[suiteName];
      if (!configs) {
        throw new Error(`Unknown test suite: ${suiteName}`);
      }
    } else {
      configs = suiteName;
    }

    // Add duration to each config
    configs = configs.map((config) => ({ ...config, duration }));

    try {
      const results = await this.suite.runSuite(configs);
      return {
        success: true,
        results,
        report: this.suite.formatReport(),
        json: this.suite.exportResults(),
      };
    } catch (error) {
      console.error('Benchmark suite failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.suite.results,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Compare two benchmark runs
   * @param {Array} baselineResults - Baseline results
   * @param {Array} optimizedResults - Optimized results
   * @returns {Object} Comparison report
   */
  compare(baselineResults, optimizedResults) {
    return BenchmarkSuite.compareResults(baselineResults, optimizedResults);
  }

  /**
   * Format comparison as readable report
   */
  formatComparison(comparison) {
    let report = '\n=== Performance Comparison ===\n\n';

    comparison.tests.forEach((test, index) => {
      const { config, baseline, optimized, improvement } = test;

      report += `Test ${index + 1}: ${config.fractalType}\n`;
      report += `  Config: ${config.iterations} iter, zoom ${config.zoom}\n`;
      report += `  Baseline:  ${baseline.avgFPS.toFixed(2)} FPS (${baseline.avgFrameTime.toFixed(2)}ms)\n`;
      report += `  Optimized: ${optimized.avgFPS.toFixed(2)} FPS (${optimized.avgFrameTime.toFixed(2)}ms)\n`;
      report += `  Improvement: ${improvement.fps > 0 ? '+' : ''}${improvement.fps.toFixed(2)}% FPS, ${improvement.frameTime > 0 ? '+' : ''}${improvement.frameTime.toFixed(2)}% frame time\n`;
      report += '\n';
    });

    report += `Summary:\n`;
    report += `  Average FPS Improvement: ${comparison.summary.avgFPSImprovement > 0 ? '+' : ''}${comparison.summary.avgFPSImprovement.toFixed(2)}%\n`;
    report += `  Average Frame Time Improvement: ${comparison.summary.avgFrameTimeImprovement > 0 ? '+' : ''}${comparison.summary.avgFrameTimeImprovement.toFixed(2)}%\n`;

    return report;
  }
}

/**
 * Convenience function to run a quick benchmark
 */
export async function quickBenchmark(regl, canvas, loadFractal, setParams) {
  const runner = new TestRunner(regl, canvas, loadFractal, setParams);
  return runner.run('quick', { duration: 2000 });
}
