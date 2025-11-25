import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../static/js/performance/benchmark.js', () => {
  class MockBenchmarkSuite {
    constructor() {
      this.results = [];
    }

    async runSuite(configs) {
      this.results = configs.map((c) => ({
        config: c,
        avgFPS: 60,
        avgFrameTime: 16.6,
      }));
      return this.results;
    }

    formatReport() {
      return 'report';
    }

    exportResults() {
      return '{"results":[]}';
    }

    static compareResults() {
      return {
        tests: [],
        summary: { avgFPSImprovement: 0, avgFrameTimeImprovement: 0 },
      };
    }
  }

  return { BenchmarkSuite: MockBenchmarkSuite };
});

import { DEFAULT_TEST_SUITES, TestRunner, quickBenchmark } from '../../static/js/performance/test-runner.js';
import { BenchmarkUI, addBenchmarkButton } from '../../static/js/performance/ui.js';

describe('TestRunner', () => {
  it('has default test suites', () => {
    expect(DEFAULT_TEST_SUITES.quick.length).toBeGreaterThan(0);
    expect(DEFAULT_TEST_SUITES.standard.length).toBeGreaterThan(0);
  });

  it('runs a named suite and returns a report', async () => {
    const runner = new TestRunner(null, null, async () => {}, () => {});
    const result = await runner.run('quick', { duration: 1000 });
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.report).toBeDefined();
  });

  it('throws on unknown suite name', async () => {
    const runner = new TestRunner(null, null, async () => {}, () => {});
    await expect(runner.run('unknown')).rejects.toThrow();
  });

  it('runs quickBenchmark convenience function', async () => {
    const result = await quickBenchmark(null, null, async () => {}, () => {});
    expect(result.success).toBe(true);
  });
});

describe('BenchmarkUI and addBenchmarkButton', () => {
  let ui;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="top-action-bar"></div>
    `;
    ui = new BenchmarkUI(null, null, async () => {}, () => {});
  });

  it('creates benchmark panel in DOM', () => {
    const panel = document.getElementById('benchmark-panel');
    expect(panel).not.toBeNull();
  });

  it('addBenchmarkButton adds a toggle button', () => {
    addBenchmarkButton(ui);
    const btn = document.getElementById('benchmark-toggle');
    expect(btn).not.toBeNull();
  });
});


