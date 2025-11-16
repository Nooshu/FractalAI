/**
 * UI components for performance benchmarking
 */

import { TestRunner } from './test-runner.js';

export class BenchmarkUI {
  constructor(regl, canvas, loadFractal, setParams) {
    this.runner = new TestRunner(regl, canvas, loadFractal, setParams);
    this.results = null;
    this.createUI();
  }

  createUI() {
    // Create benchmark panel
    const panel = document.createElement('div');
    panel.id = 'benchmark-panel';
    panel.className = 'benchmark-panel';
    panel.innerHTML = `
      <div class="benchmark-header">
        <h3>Performance Benchmark</h3>
        <button id="benchmark-close" class="benchmark-close">×</button>
      </div>
      <div class="benchmark-content">
        <div class="benchmark-controls">
          <label>
            Test Suite:
            <select id="benchmark-suite">
              <option value="quick">Quick (2 tests, ~10s)</option>
              <option value="standard" selected>Standard (5 tests, ~25s)</option>
              <option value="comprehensive">Comprehensive (13 tests, ~65s)</option>
              <option value="mandelbrot">Mandelbrot Deep Dive (8 tests, ~40s)</option>
            </select>
          </label>
          <label>
            Duration per test (ms):
            <input type="number" id="benchmark-duration" value="3000" min="1000" max="10000" step="500">
          </label>
          <button id="benchmark-run" class="benchmark-btn">Run Benchmark</button>
          <button id="benchmark-export-json" class="benchmark-btn" disabled>Export JSON</button>
          <button id="benchmark-export-txt" class="benchmark-btn" disabled>Export TXT</button>
        </div>
        <div id="benchmark-status" class="benchmark-status"></div>
        <div id="benchmark-results" class="benchmark-results"></div>
      </div>
    `;

    // Add to page
    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('benchmark-close').addEventListener('click', () => {
      this.hide();
    });

    document.getElementById('benchmark-run').addEventListener('click', () => {
      this.runBenchmark();
    });

    document.getElementById('benchmark-export-json').addEventListener('click', () => {
      this.exportResults('json');
    });

    document.getElementById('benchmark-export-txt').addEventListener('click', () => {
      this.exportResults('txt');
    });

    // Initially hidden
    this.hide();
  }

  show() {
    const panel = document.getElementById('benchmark-panel');
    if (panel) {
      panel.style.display = 'block';
    }
  }

  hide() {
    const panel = document.getElementById('benchmark-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  async runBenchmark() {
    const suiteSelect = document.getElementById('benchmark-suite');
    const durationInput = document.getElementById('benchmark-duration');
    const runBtn = document.getElementById('benchmark-run');
    const statusDiv = document.getElementById('benchmark-status');
    const resultsDiv = document.getElementById('benchmark-results');
    const exportJsonBtn = document.getElementById('benchmark-export-json');
    const exportTxtBtn = document.getElementById('benchmark-export-txt');

    const suiteName = suiteSelect.value;
    const duration = parseInt(durationInput.value, 10);

    // Disable controls
    runBtn.disabled = true;
    suiteSelect.disabled = true;
    durationInput.disabled = true;

    statusDiv.innerHTML = '<div class="benchmark-progress">Running benchmark...</div>';
    resultsDiv.innerHTML = '';

    try {
      const result = await this.runner.run(suiteName, {
        duration,
        onProgress: (progress) => {
          statusDiv.innerHTML = `<div class="benchmark-progress">${progress}</div>`;
        },
      });

      if (result.success) {
        this.results = result.results;
        resultsDiv.innerHTML = `<pre>${result.report}</pre>`;
        exportJsonBtn.disabled = false;
        exportTxtBtn.disabled = false;
        statusDiv.innerHTML = '<div class="benchmark-success">✓ Benchmark completed successfully</div>';
      } else {
        statusDiv.innerHTML = `<div class="benchmark-error">✗ Benchmark failed: ${result.error}</div>`;
      }
    } catch (error) {
      statusDiv.innerHTML = `<div class="benchmark-error">✗ Error: ${error.message}</div>`;
      console.error('Benchmark error:', error);
    } finally {
      // Re-enable controls
      runBtn.disabled = false;
      suiteSelect.disabled = false;
      durationInput.disabled = false;
    }
  }

  exportResults(format = 'json') {
    if (!this.results) {
      alert('No results to export. Run a benchmark first.');
      return;
    }

    let content, mimeType, filename;

    if (format === 'txt') {
      content = this.runner.suite.formatReport();
      mimeType = 'text/plain';
      filename = `benchmark-${Date.now()}.txt`;
    } else {
      content = this.runner.suite.exportResults();
      mimeType = 'application/json';
      filename = `benchmark-${Date.now()}.json`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Compare two benchmark results
   */
  compareResults(baselineResults, optimizedResults) {
    const comparison = this.runner.compare(baselineResults, optimizedResults);
    const report = this.runner.formatComparison(comparison);

    const resultsDiv = document.getElementById('benchmark-results');
    resultsDiv.innerHTML = `<pre>${report}</pre>`;

    return comparison;
  }
}

/**
 * Add benchmark button to the UI (top right, within top-action-bar)
 */
export function addBenchmarkButton(benchmarkUI) {
  // Check if button already exists
  if (document.getElementById('benchmark-toggle')) {
    return;
  }

  // Add to existing top-action-bar
  const topActionBar = document.querySelector('.top-action-bar');
  if (!topActionBar) {
    console.warn('Top action bar not found, cannot add benchmark button');
    return;
  }

  const button = document.createElement('button');
  button.id = 'benchmark-toggle';
  button.className = 'top-action-btn';
  button.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
    Benchmark
  `;
  button.title = 'Open Performance Benchmark';

  topActionBar.appendChild(button);

  button.addEventListener('click', () => {
    benchmarkUI.show();
  });
}

