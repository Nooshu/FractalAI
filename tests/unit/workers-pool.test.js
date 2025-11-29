import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerPool } from '../../static/js/workers/pool.js';

// Mock Worker
class MockWorker {
  constructor(script) {
    this.script = script;
    this.listeners = {
      message: [],
      error: [],
    };
    this.terminated = false;
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  postMessage(message, _transfer) {
    if (this.terminated) {
      throw new Error('Worker is terminated');
    }
    // Simulate async processing
    setTimeout(() => {
      if (message.type === 'tile-request') {
        // Simulate worker response
        const response = {
          type: 'tile-response',
          tileId: message.tileId,
          data: new Float32Array(message.width * message.height),
          metadata: {
            computationTime: 10,
            width: message.width,
            height: message.height,
          },
        };
        this.listeners.message.forEach((handler) => {
          handler({ data: response });
        });
      }
    }, 0);
  }

  terminate() {
    this.terminated = true;
    this.listeners = { message: [], error: [] };
  }
}

describe('WorkerPool', () => {
  let originalWorker;
  let mockWorkers;

  beforeEach(() => {
    // Save original Worker
    originalWorker = global.Worker;
    mockWorkers = [];

    // Mock Worker constructor
    global.Worker = class extends MockWorker {
      constructor(script) {
        super(script);
        mockWorkers.push(this);
      }
    };

    // Mock navigator.hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: 8,
    });
  });

  afterEach(() => {
    // Restore original Worker
    global.Worker = originalWorker;
    mockWorkers = [];
  });

  describe('constructor', () => {
    it('should create worker pool with default settings', () => {
      const pool = new WorkerPool();
      expect(pool.getWorkerCount()).toBe(4); // min(4, 8-1) = 4
      expect(pool.minWorkers).toBe(1);
      expect(pool.maxWorkers).toBe(4);
    });

    it('should respect maxWorkers option', () => {
      const pool = new WorkerPool({ maxWorkers: 2 });
      expect(pool.getWorkerCount()).toBe(2);
    });

    it('should respect minWorkers option', () => {
      const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 2 });
      expect(pool.getWorkerCount()).toBe(2);
    });

    it('should handle low hardwareConcurrency', () => {
      navigator.hardwareConcurrency = 2;
      const pool = new WorkerPool();
      expect(pool.getWorkerCount()).toBe(1); // min(4, 2-1) = 1
    });

    it('should use custom worker script', () => {
      new WorkerPool({ workerScript: 'custom-worker.js' });
      expect(mockWorkers[0].script).toBe('custom-worker.js');
    });
  });

  describe('computeTile', () => {
    it('should compute a tile successfully', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const response = await pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');

      expect(response.type).toBe('tile-response');
      expect(response.tileId).toBe('tile-1');
      expect(response.data).toBeInstanceOf(Float32Array);
      expect(response.data.length).toBe(256 * 256);
      expect(response.metadata.width).toBe(256);
      expect(response.metadata.height).toBe(256);
    });

    it('should handle multiple concurrent tiles', async () => {
      const pool = new WorkerPool({ maxWorkers: 2 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promises = [
        pool.computeTile('tile-1', 0, 0, 128, 128, params, 'mandelbrot'),
        pool.computeTile('tile-2', 128, 0, 128, 128, params, 'mandelbrot'),
        pool.computeTile('tile-3', 0, 128, 128, 128, params, 'mandelbrot'),
      ];

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response, index) => {
        expect(response.tileId).toBe(`tile-${index + 1}`);
        expect(response.data).toBeInstanceOf(Float32Array);
      });
    });

    it('should reject when pool is shutting down', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      pool.shutdown();

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      await expect(
        pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot')
      ).rejects.toThrow('Worker pool is shutting down');
    });
  });

  describe('cancelTiles', () => {
    it('should cancel specific tiles', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promise1 = pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');
      const promise2 = pool.computeTile('tile-2', 0, 0, 256, 256, params, 'mandelbrot');

      pool.cancelTiles(['tile-1']);

      await expect(promise1).rejects.toThrow('Tile computation cancelled');
      // tile-2 should still complete
      const response2 = await promise2;
      expect(response2.tileId).toBe('tile-2');
    });

    it('should cancel all tiles when empty array provided', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promise1 = pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');
      const promise2 = pool.computeTile('tile-2', 0, 0, 256, 256, params, 'mandelbrot');

      pool.cancelTiles([]);

      await expect(promise1).rejects.toThrow('Tile computation cancelled');
      await expect(promise2).rejects.toThrow('Tile computation cancelled');
    });
  });

  describe('resize', () => {
    it('should add workers when increasing size', () => {
      const pool = new WorkerPool({ maxWorkers: 4 });
      expect(pool.getWorkerCount()).toBe(4);

      pool.resize(2);
      expect(pool.getWorkerCount()).toBe(2);
    });

    it('should remove workers when decreasing size', () => {
      const pool = new WorkerPool({ maxWorkers: 4 });
      expect(pool.getWorkerCount()).toBe(4);

      pool.resize(2);
      expect(pool.getWorkerCount()).toBe(2);
    });

    it('should respect minWorkers', () => {
      const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 4 });
      expect(pool.getWorkerCount()).toBe(4);

      pool.resize(1);
      expect(pool.getWorkerCount()).toBe(2); // Should not go below minWorkers
    });

    it('should respect maxWorkers', () => {
      const pool = new WorkerPool({ maxWorkers: 2 });
      expect(pool.getWorkerCount()).toBe(2);

      pool.resize(10);
      expect(pool.getWorkerCount()).toBe(2); // Should not exceed maxWorkers
    });
  });

  describe('handleWorkerError', () => {
    it('should handle worker errors gracefully', async () => {
      // Suppress expected error logging
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promise = pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');

      // Simulate worker error
      const worker = mockWorkers[0];
      worker.listeners.error.forEach((handler) => {
        handler(new Error('Worker error'));
      });

      await expect(promise).rejects.toThrow('Worker error');

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getPendingTaskCount', () => {
    it('should return correct pending task count', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      expect(pool.getPendingTaskCount()).toBe(0);

      const promise1 = pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');
      expect(pool.getPendingTaskCount()).toBe(1);

      const promise2 = pool.computeTile('tile-2', 0, 0, 256, 256, params, 'mandelbrot');
      expect(pool.getPendingTaskCount()).toBe(2);

      await promise1;
      expect(pool.getPendingTaskCount()).toBe(1);

      await promise2;
      expect(pool.getPendingTaskCount()).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should terminate all workers', () => {
      const pool = new WorkerPool({ maxWorkers: 3 });
      expect(mockWorkers).toHaveLength(3);
      expect(mockWorkers.every((w) => !w.terminated)).toBe(true);

      pool.shutdown();

      expect(mockWorkers.every((w) => w.terminated)).toBe(true);
      expect(pool.getWorkerCount()).toBe(0);
    });

    it('should cancel all pending tasks on shutdown', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promise = pool.computeTile('tile-1', 0, 0, 256, 256, params, 'mandelbrot');
      pool.shutdown();

      await expect(promise).rejects.toThrow('Tile computation cancelled');
    });
  });
});

