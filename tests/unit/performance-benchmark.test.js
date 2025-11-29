import { describe, it, expect } from 'vitest';
import {
  PerformanceBenchmark,
  WebGLTiming,
  BenchmarkSuite,
} from '../../static/js/performance/benchmark.js';

describe('PerformanceBenchmark', () => {
  it('computes basic statistics from frameTimes', () => {
    const bench = new PerformanceBenchmark();
    bench.startTime = 0;
    bench.frameTimes = [10, 20, 30, 40, 50];
    bench.frameCount = bench.frameTimes.length;

    const results = bench.getResults();
    expect(results).not.toBeNull();
    expect(results.frameCount).toBe(5);
    expect(results.minFrameTime).toBe(10);
    expect(results.maxFrameTime).toBe(50);
    expect(results.p50FrameTime).toBeGreaterThanOrEqual(10);
    expect(results.p95FrameTime).toBeGreaterThanOrEqual(results.p50FrameTime);
  });

  it('percentile helper returns value from sorted array', () => {
    const bench = new PerformanceBenchmark();
    const arr = [1, 2, 3, 4, 5];
    expect(bench.percentile(arr, 50)).toBeGreaterThanOrEqual(3);
    expect(bench.percentile(arr, 100)).toBe(5);
  });
});

describe('WebGLTiming', () => {
  it('reports unsupported when extension is missing', () => {
    const gl = {
      getExtension: () => null,
    };
    const timing = new WebGLTiming(gl);
    expect(timing.isSupported()).toBe(false);
    expect(timing.getResults()).toEqual([]);
  });

  it('clears queries on clear()', () => {
    const deleted = [];
    const gl = {
      getExtension: () => ({
        TIME_ELAPSED_EXT: 0x88bf,
        GPU_DISJOINT_EXT: 0x8fbb,
      }),
      createQuery: () => ({}),
      beginQuery: () => {},
      endQuery: () => {},
      getQueryParameter: () => 0,
      getParameter: () => 0,
      deleteQuery: (q) => deleted.push(q),
    };
    const timing = new WebGLTiming(gl);
    timing.beginQuery();
    timing.endQuery();
    timing.clear();
    expect(deleted.length).toBeGreaterThanOrEqual(1);
  });
});

describe('BenchmarkSuite', () => {
  it('can be constructed with minimal arguments', () => {
    const suite = new BenchmarkSuite(
      null,
      null,
      async () => {},
      () => {}
    );
    expect(suite.results).toEqual([]);
  });
});
