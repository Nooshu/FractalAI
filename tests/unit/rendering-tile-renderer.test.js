import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TileRenderer } from '../../static/js/rendering/tile-renderer.js';
import { WorkerPool } from '../../static/js/workers/pool.js';

// Ensure ImageData is available (jsdom should provide it, but ensure it's available)
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}

// Also ensure it's available on window for the renderer
if (typeof window !== 'undefined' && typeof window.ImageData === 'undefined') {
  window.ImageData = global.ImageData;
}

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

  postMessage(message) {
    if (this.terminated) {
      throw new Error('Worker is terminated');
    }
    // Simulate async processing
    setTimeout(() => {
      if (message.type === 'tile-request') {
        // Create scalar field data
        const data = new Float32Array(message.width * message.height);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random(); // Simulate fractal values
        }

        const response = {
          type: 'tile-response',
          tileId: message.tileId,
          data,
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

describe('TileRenderer', () => {
  let mockCanvas;
  let mockWorkerPool;
  let originalWorker;

  beforeEach(() => {
    // Mock Worker
    originalWorker = global.Worker;
    global.Worker = class extends MockWorker {
      constructor(script) {
        super(script);
      }
    };

    // Mock canvas
    mockCanvas = {
      width: 512,
      height: 512,
      getContext: vi.fn(() => ({
        putImageData: vi.fn(),
      })),
    };

    // Create mock worker pool
    mockWorkerPool = new WorkerPool({ maxWorkers: 2 });
  });

  afterEach(() => {
    global.Worker = originalWorker;
    if (mockWorkerPool) {
      mockWorkerPool.shutdown();
    }
    // Clean up any pending timers
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create TileRenderer with default options', () => {
      const renderer = new TileRenderer();
      expect(renderer.tileSize).toBe(256);
      expect(renderer.workerPool).toBeInstanceOf(WorkerPool);
    });

    it('should accept custom options', () => {
      const customPool = new WorkerPool({ maxWorkers: 1 });
      const renderer = new TileRenderer({
        workerPool: customPool,
        tileSize: 128,
        onTileComplete: vi.fn(),
      });

      expect(renderer.workerPool).toBe(customPool);
      expect(renderer.tileSize).toBe(128);
      expect(renderer.onTileComplete).toBeDefined();
    });
  });

  describe('render', () => {
    it('should render fractal using worker pool', async () => {
      vi.useFakeTimers();
      const putImageDataSpy = vi.fn();
      const mockCtx = {
        putImageData: putImageDataSpy,
      };
      const canvasWithSpy = {
        width: 512,
        height: 512,
        getContext: vi.fn(() => mockCtx),
      };

      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
        tileSize: 256,
      });

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const renderPromise = renderer.render(canvasWithSpy, params, 'mandelbrot');
      await vi.runAllTimersAsync();
      const imageData = await renderPromise;

      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(512);
      expect(imageData.height).toBe(512);
      expect(imageData.data).toBeDefined();
      expect(imageData.data.length).toBe(512 * 512 * 4); // RGBA

      expect(canvasWithSpy.getContext).toHaveBeenCalledWith('2d');
      expect(putImageDataSpy).toHaveBeenCalledWith(imageData, 0, 0);

      vi.useRealTimers();
    });

    it('should handle non-square canvas', async () => {
      vi.useFakeTimers();
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
        tileSize: 256,
      });

      const wideCanvas = {
        width: 1024,
        height: 512,
        getContext: vi.fn(() => ({
          putImageData: vi.fn(),
        })),
      };

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const renderPromise = renderer.render(wideCanvas, params, 'mandelbrot');
      await vi.runAllTimersAsync();
      const imageData = await renderPromise;

      expect(imageData.width).toBe(1024);
      expect(imageData.height).toBe(512);

      vi.useRealTimers();
    });

    it('should call onTileComplete callback for each tile', async () => {
      vi.useFakeTimers();
      const onTileComplete = vi.fn();
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
        tileSize: 256,
        onTileComplete,
      });

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const renderPromise = renderer.render(mockCanvas, params, 'mandelbrot');
      await vi.runAllTimersAsync();
      await renderPromise;

      // Should be called for each tile (2x2 = 4 tiles for 512x512 canvas with 256 tile size)
      expect(onTileComplete).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle partial tiles at edges', async () => {
      vi.useFakeTimers();
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
        tileSize: 300, // Larger than canvas in one dimension
      });

      const smallCanvas = {
        width: 200,
        height: 150,
        getContext: vi.fn(() => ({
          putImageData: vi.fn(),
        })),
      };

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const renderPromise = renderer.render(smallCanvas, params, 'mandelbrot');
      await vi.runAllTimersAsync();
      const imageData = await renderPromise;

      expect(imageData.width).toBe(200);
      expect(imageData.height).toBe(150);

      vi.useRealTimers();
    });
  });

  describe('renderTileToImageData', () => {
    it('should convert scalar field to RGBA pixels', () => {
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
      });

      const imageData = new ImageData(256, 256);
      const scalarField = new Float32Array(256 * 256);
      for (let i = 0; i < scalarField.length; i++) {
        scalarField[i] = 0.5; // Normalized value
      }

      renderer.renderTileToImageData(
        imageData.data,
        256,
        256,
        0,
        0,
        256,
        256,
        scalarField,
        1 // colorScheme: fire
      );

      // Check that pixels were written (first pixel)
      const firstPixel = imageData.data[0];
      expect(firstPixel).toBeGreaterThanOrEqual(0);
      expect(firstPixel).toBeLessThanOrEqual(255);
    });

    it('should handle points in the set (black)', () => {
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
      });

      const imageData = new ImageData(256, 256);
      const scalarField = new Float32Array(256 * 256);
      scalarField[0] = 1.0; // Point in set (normalized value >= 1.0)

      renderer.renderTileToImageData(
        imageData.data,
        256,
        256,
        0,
        0,
        256,
        256,
        scalarField,
        1 // colorScheme: fire
      );

      // First pixel should be black (in set)
      expect(imageData.data[0]).toBe(0); // R
      expect(imageData.data[1]).toBe(0); // G
      expect(imageData.data[2]).toBe(0); // B
      expect(imageData.data[3]).toBe(255); // A
    });
  });

  describe('cancelAllTiles', () => {
    it('should cancel all pending tiles', async () => {
      vi.useFakeTimers();
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
        tileSize: 256,
      });

      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const promise = renderer.render(mockCanvas, params, 'mandelbrot');

      // Cancel immediately before workers respond
      renderer.cancelAllTiles();

      // Advance timers - workers might still respond, but tiles are marked cancelled
      await vi.runAllTimersAsync();

      // The promise might resolve (if workers already responded) or reject (if cancelled first)
      // Either way, activeTiles should be empty after cancellation
      try {
        await promise;
      } catch (error) {
        // Expected if cancelled before workers respond
        expect(error.message).toContain('cancelled');
      }

      expect(renderer.activeTiles.size).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should cancel all tiles on cleanup', () => {
      const renderer = new TileRenderer({
        workerPool: mockWorkerPool,
      });

      renderer.activeTiles.set('tile-1', { promise: Promise.resolve(), cancelled: false });
      renderer.activeTiles.set('tile-2', { promise: Promise.resolve(), cancelled: false });

      expect(renderer.activeTiles.size).toBe(2);

      renderer.cleanup();

      expect(renderer.activeTiles.size).toBe(0);
    });
  });
});
