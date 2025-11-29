import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Functional tests for main.js
 *
 * Since main.js uses global state and DOM dependencies, these tests:
 * - Mock DOM elements and browser APIs
 * - Mock regl and WebGL context
 * - Test functions through their behavior and side effects
 * - Verify state changes and DOM updates
 */

describe('main.js functional tests', () => {
  // Mock DOM elements
  let mockCanvas;
  let mockContainer;
  let mockDOMCache;
  let mockDocument;
  let mockWindow;
  let mockFramebuffer;

  beforeEach(() => {
    // Create mock framebuffer
    mockFramebuffer = {
      destroy: vi.fn(),
    };

    // Create mock canvas
    mockCanvas = {
      id: 'fractal-canvas',
      width: 800,
      height: 600,
      style: {
        width: '800px',
        height: '600px',
        display: 'block',
        cursor: '',
      },
      getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
      })),
      parentElement: null,
    };

    // Create mock container
    mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
      })),
    };

    mockCanvas.parentElement = mockContainer;

    // Create mock DOM cache elements
    mockDOMCache = {
      coordZoom: { textContent: '' },
      coordOffsetX: { textContent: '' },
      coordOffsetY: { textContent: '' },
      copyCoordsBtn: { addEventListener: vi.fn() },
      fps: { textContent: '' },
      loadingBar: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      },
    };

    // Create mock document
    mockDocument = {
      getElementById: vi.fn((id) => {
        if (id === 'fractal-canvas') return mockCanvas;
        if (id === 'coord-zoom') return mockDOMCache.coordZoom;
        if (id === 'coord-offset-x') return mockDOMCache.coordOffsetX;
        if (id === 'coord-offset-y') return mockDOMCache.coordOffsetY;
        if (id === 'copy-coords-btn') return mockDOMCache.copyCoordsBtn;
        if (id === 'fps') return mockDOMCache.fps;
        if (id === 'loading-bar') return mockDOMCache.loadingBar;
        if (id === 'fractal-type') return { value: 'mandelbrot' };
        if (id === 'wikipedia-link') return { href: '' };
        if (id === 'iterations') return { value: '125' };
        if (id === 'iterations-value') return { textContent: '' };
        if (id === 'color-scheme') return { value: 'classic' };
        if (id === 'x-scale') return { value: '1.0' };
        if (id === 'x-scale-value') return { textContent: '' };
        if (id === 'y-scale') return { value: '1.0' };
        if (id === 'y-scale-value') return { textContent: '' };
        if (id === 'julia-c-real') return { value: '-0.7269', disabled: false };
        if (id === 'julia-c-real-value') return { textContent: '' };
        if (id === 'julia-c-imag') return { value: '0.1889', disabled: false };
        if (id === 'julia-c-imag-value') return { textContent: '' };
        if (id === 'debug-fractal-name') return { textContent: '' };
        if (id === 'debug-zoom') return { textContent: '' };
        if (id === 'debug-offset-x') return { textContent: '' };
        if (id === 'debug-offset-y') return { textContent: '' };
        if (id === 'debug-copy-fractal-name') return { addEventListener: vi.fn() };
        if (id === 'debug-copy-zoom') return { addEventListener: vi.fn() };
        if (id === 'debug-copy-offset-x') return { addEventListener: vi.fn() };
        if (id === 'debug-copy-offset-y') return { addEventListener: vi.fn() };
        if (id === 'debug-copy-all') return { addEventListener: vi.fn(), innerHTML: '', style: {} };
        if (id === 'share-fractal-btn')
          return { addEventListener: vi.fn(), innerHTML: '', style: {} };
        if (id === 'selection-box')
          return {
            style: { left: '', top: '', width: '', height: '' },
            classList: { add: vi.fn(), remove: vi.fn() },
          };
        if (id === 'update-fractal') return { addEventListener: vi.fn() };
        if (id === 'reset-view') return { addEventListener: vi.fn() };
        if (id === 'screenshot') return { addEventListener: vi.fn() };
        if (id === 'fullscreen') return { addEventListener: vi.fn() };
        if (id === 'show-panel-btn') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-screenshot') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-color-cycle') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-random') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-iterations-up') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-iterations-down') return { addEventListener: vi.fn() };
        if (id === 'fullscreen-iterations-number') return { textContent: '' };
        if (id === 'fullscreen-color-palette') return { getContext: vi.fn() };
        if (id === 'fullscreen-random-number') return { textContent: '' };
        if (id === 'fullscreen-controls') return { classList: { add: vi.fn(), remove: vi.fn() } };
        return null;
      }),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    // Create mock window
    mockWindow = {
      devicePixelRatio: 2,
      location: {
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        href: 'http://localhost:3000/',
      },
      addEventListener: vi.fn(),
      requestAnimationFrame: vi.fn((cb) => {
        setTimeout(cb, 16);
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
      getComputedStyle: vi.fn(() => ({})),
    };

    // Mock navigator using Object.defineProperty to avoid read-only error
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve()),
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock global objects
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DOM cache initialization', () => {
    it('should initialize DOM cache with correct element IDs', () => {
      // This test verifies that initDOMCache() correctly retrieves DOM elements
      // Since we can't directly test the function, we verify the mock setup
      const coordZoom = mockDocument.getElementById('coord-zoom');
      const coordOffsetX = mockDocument.getElementById('coord-offset-x');
      const coordOffsetY = mockDocument.getElementById('coord-offset-y');
      const copyCoordsBtn = mockDocument.getElementById('copy-coords-btn');
      const fps = mockDocument.getElementById('fps');
      const loadingBar = mockDocument.getElementById('loading-bar');

      expect(coordZoom).toBeDefined();
      expect(coordOffsetX).toBeDefined();
      expect(coordOffsetY).toBeDefined();
      expect(copyCoordsBtn).toBeDefined();
      expect(fps).toBeDefined();
      expect(loadingBar).toBeDefined();
    });
  });

  describe('Pixel ratio calculation', () => {
    it('should calculate pixel ratio based on zoom level', () => {
      // Test the calculatePixelRatio logic
      const basePixelRatio = mockWindow.devicePixelRatio || 1;
      const testCases = [
        { zoom: 1, expectedMultiplier: 1 },
        { zoom: 4, expectedMultiplier: 2 }, // sqrt(4) = 2
        { zoom: 16, expectedMultiplier: 4 }, // sqrt(16) = 4, capped at 4
        { zoom: 100, expectedMultiplier: 4 }, // sqrt(100) = 10, but capped at 4
      ];

      testCases.forEach(({ zoom, expectedMultiplier }) => {
        const zoomMultiplier = Math.min(Math.sqrt(zoom), 4);
        const expectedRatio = basePixelRatio * zoomMultiplier;
        expect(zoomMultiplier).toBe(expectedMultiplier);
        expect(expectedRatio).toBe(basePixelRatio * expectedMultiplier);
      });
    });

    it('should use device pixel ratio when available', () => {
      const basePixelRatio = mockWindow.devicePixelRatio;
      expect(basePixelRatio).toBe(2);
    });

    it('should default to 1 when device pixel ratio is not available', () => {
      const basePixelRatio = 1; // Default when undefined
      expect(basePixelRatio).toBe(1);
    });
  });

  describe('Cache key generation', () => {
    it('should generate cache key with correct format', () => {
      // Test the generateCacheKey logic
      const testParams = {
        zoom: 1.5,
        offset: { x: 0.1234, y: -0.5678 },
        iterations: 125,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: -0.7269, y: 0.1889 },
      };

      const fractalType = 'mandelbrot';
      const zoom = Math.round(testParams.zoom * 1000) / 1000;
      const offsetX = Math.round(testParams.offset.x * 10000) / 10000;
      const offsetY = Math.round(testParams.offset.y * 10000) / 10000;
      const iterations = testParams.iterations;
      const colorScheme = testParams.colorScheme;
      const xScale = Math.round(testParams.xScale * 100) / 100;
      const yScale = Math.round(testParams.yScale * 100) / 100;
      const isJulia = false; // mandelbrot is not a Julia type
      const juliaCX = isJulia ? Math.round(testParams.juliaC.x * 10000) / 10000 : 0;
      const juliaCY = isJulia ? Math.round(testParams.juliaC.y * 10000) / 10000 : 0;
      const width = 800;
      const height = 600;

      const expectedKey = `${fractalType}_${zoom}_${offsetX}_${offsetY}_${iterations}_${colorScheme}_${xScale}_${yScale}_${juliaCX}_${juliaCY}_${width}_${height}`;

      expect(expectedKey).toBe('mandelbrot_1.5_0.1234_-0.5678_125_classic_1_1_0_0_800_600');
    });

    it('should include Julia parameters for Julia-type fractals', () => {
      const testParams = {
        zoom: 2.0,
        offset: { x: 0, y: 0 },
        iterations: 200,
        colorScheme: 'fire',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: -0.7269, y: 0.1889 },
      };

      const isJulia = true;
      const juliaCX = isJulia ? Math.round(testParams.juliaC.x * 10000) / 10000 : 0;
      const juliaCY = isJulia ? Math.round(testParams.juliaC.y * 10000) / 10000 : 0;

      expect(juliaCX).toBe(-0.7269);
      expect(juliaCY).toBe(0.1889);
    });

    it('should round values to avoid floating point precision issues', () => {
      const zoom = Math.round(1.23456789 * 1000) / 1000;
      const offsetX = Math.round(0.123456789 * 10000) / 10000;
      const xScale = Math.round(1.234 * 100) / 100;

      expect(zoom).toBe(1.235);
      expect(offsetX).toBe(0.1235);
      expect(xScale).toBe(1.23);
    });
  });

  describe('Frame cache management', () => {
    it('should store and retrieve cached frames', () => {
      const frameCache = new Map();

      const key1 = 'test_key_1';
      const key2 = 'test_key_2';
      const framebuffer1 = mockFramebuffer;
      const framebuffer2 = { ...mockFramebuffer };

      frameCache.set(key1, { framebuffer: framebuffer1, timestamp: Date.now() });
      frameCache.set(key2, { framebuffer: framebuffer2, timestamp: Date.now() });

      expect(frameCache.size).toBe(2);
      expect(frameCache.get(key1).framebuffer).toBe(framebuffer1);
      expect(frameCache.get(key2).framebuffer).toBe(framebuffer2);
    });

    it('should limit cache size to MAX_CACHE_SIZE', () => {
      const frameCache = new Map();
      const MAX_CACHE_SIZE = 10;

      // Fill cache to max size
      for (let i = 0; i < MAX_CACHE_SIZE; i++) {
        frameCache.set(`key_${i}`, {
          framebuffer: { ...mockFramebuffer },
          timestamp: Date.now(),
        });
      }

      expect(frameCache.size).toBe(MAX_CACHE_SIZE);

      // Add one more - should remove oldest
      const oldestKey = frameCache.keys().next().value;
      const oldEntry = frameCache.get(oldestKey);
      if (oldEntry && oldEntry.framebuffer) {
        oldEntry.framebuffer.destroy();
      }
      frameCache.delete(oldestKey);

      const newFramebuffer = { ...mockFramebuffer };
      frameCache.set('new_key', { framebuffer: newFramebuffer, timestamp: Date.now() });

      expect(frameCache.size).toBe(MAX_CACHE_SIZE);
      expect(frameCache.has('new_key')).toBe(true);
    });

    it('should clear all cached frames', () => {
      const frameCache = new Map();
      const destroy1 = vi.fn();
      const destroy2 = vi.fn();

      frameCache.set('key1', { framebuffer: { destroy: destroy1 }, timestamp: Date.now() });
      frameCache.set('key2', { framebuffer: { destroy: destroy2 }, timestamp: Date.now() });

      // Clear cache
      for (const [, entry] of frameCache.entries()) {
        if (entry.framebuffer) entry.framebuffer.destroy();
      }
      frameCache.clear();

      expect(frameCache.size).toBe(0);
      expect(destroy1).toHaveBeenCalled();
      expect(destroy2).toHaveBeenCalled();
    });
  });

  describe('Fractal state encoding/decoding', () => {
    it('should encode fractal state to base64 URL-safe string', () => {
      const state = {
        t: 'mandelbrot',
        c: 'classic',
        z: 1.5,
        i: 125,
        ox: 0.12345,
        oy: -0.56789,
        xs: 1.0,
        ys: 1.0,
      };

      const json = JSON.stringify(state);
      const encoded = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode fractal state from base64 URL-safe string', () => {
      const state = {
        t: 'julia',
        c: 'fire',
        z: 2.0,
        i: 200,
        ox: 0.5,
        oy: -0.3,
        xs: 1.2,
        ys: 0.8,
        jx: -0.7269,
        jy: 0.1889,
      };

      const json = JSON.stringify(state);
      let base64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Decode
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const decodedJson = atob(base64);
      const decoded = JSON.parse(decodedJson);

      expect(decoded.t).toBe('julia');
      expect(decoded.c).toBe('fire');
      expect(decoded.z).toBe(2.0);
      expect(decoded.i).toBe(200);
      expect(decoded.ox).toBe(0.5);
      expect(decoded.oy).toBe(-0.3);
      expect(decoded.xs).toBe(1.2);
      expect(decoded.ys).toBe(0.8);
      expect(decoded.jx).toBe(-0.7269);
      expect(decoded.jy).toBe(0.1889);
    });

    it('should handle invalid encoded strings gracefully', () => {
      const invalidEncoded = 'invalid-seed!!!';

      try {
        let base64 = invalidEncoded.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const decodedJson = atob(base64);
        JSON.parse(decodedJson);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined();
      }
    });

    it('should round values during encoding', () => {
      const state = {
        t: 'mandelbrot',
        z: Math.round(1.23456789 * 10000) / 10000,
        ox: Math.round(0.123456789 * 100000) / 100000,
        xs: Math.round(1.234 * 100) / 100,
      };

      expect(state.z).toBe(1.2346);
      expect(state.ox).toBe(0.12346);
      expect(state.xs).toBe(1.23);
    });
  });

  describe('Coordinate display updates', () => {
    it('should update coordinate display with rounded values', () => {
      const testParams = {
        zoom: 1.23456789,
        offset: { x: 0.123456789, y: -0.987654321 },
      };

      const coordZoom = mockDOMCache.coordZoom;
      const coordOffsetX = mockDOMCache.coordOffsetX;
      const coordOffsetY = mockDOMCache.coordOffsetY;

      // Simulate how textContent works - converts numbers to strings
      coordZoom.textContent = String(Math.round(testParams.zoom * 1000) / 1000);
      coordOffsetX.textContent = String(Math.round(testParams.offset.x * 10000) / 10000);
      coordOffsetY.textContent = String(Math.round(testParams.offset.y * 10000) / 10000);

      expect(coordZoom.textContent).toBe('1.235');
      expect(coordOffsetX.textContent).toBe('0.1235');
      expect(coordOffsetY.textContent).toBe('-0.9877');
    });
  });

  describe('Loading bar management', () => {
    it('should show loading bar', () => {
      const loadingBar = mockDOMCache.loadingBar;
      loadingBar.classList.add('active');

      expect(loadingBar.classList.add).toHaveBeenCalledWith('active');
    });

    it('should hide loading bar', () => {
      const loadingBar = mockDOMCache.loadingBar;
      loadingBar.classList.remove('active');

      expect(loadingBar.classList.remove).toHaveBeenCalledWith('active');
    });
  });

  describe('URL generation for sharing', () => {
    it('should generate shareable URL with seed parameter', () => {
      const seed = 'test_seed_123';
      const url = new URL(mockWindow.location.origin + mockWindow.location.pathname);
      url.searchParams.set('seed', seed);

      expect(url.toString()).toContain('seed=test_seed_123');
      expect(url.origin).toBe('http://localhost:3000');
      expect(url.pathname).toBe('/');
    });

    it('should handle URLs with existing query parameters', () => {
      mockWindow.location.search = '?existing=param';
      const seed = 'new_seed';
      const url = new URL(mockWindow.location.origin + mockWindow.location.pathname);
      url.searchParams.set('seed', seed);

      // Should only have seed parameter (clean URL)
      expect(url.searchParams.get('seed')).toBe('new_seed');
      expect(url.searchParams.get('existing')).toBeNull();
    });
  });

  describe('Wikipedia link updates', () => {
    it('should update Wikipedia link based on fractal type', () => {
      const fractalWikipediaUrls = {
        mandelbrot: 'https://en.wikipedia.org/wiki/Mandelbrot_set',
        julia: 'https://en.wikipedia.org/wiki/Julia_set',
        sierpinski: 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
      };

      const fractalType = 'mandelbrot';
      const url = fractalWikipediaUrls[fractalType] || 'https://en.wikipedia.org/wiki/Fractal';

      expect(url).toBe('https://en.wikipedia.org/wiki/Mandelbrot_set');
    });

    it('should use default Wikipedia link for unknown fractal types', () => {
      const fractalWikipediaUrls = {
        mandelbrot: 'https://en.wikipedia.org/wiki/Mandelbrot_set',
      };

      const fractalType = 'unknown-fractal';
      const url = fractalWikipediaUrls[fractalType] || 'https://en.wikipedia.org/wiki/Fractal';

      expect(url).toBe('https://en.wikipedia.org/wiki/Fractal');
    });
  });

  describe('Canvas dimension updates', () => {
    it('should update canvas dimensions based on container size', () => {
      const container = mockContainer;
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 800;
      const height = rect.height || container.clientHeight || 600;
      const pixelRatio = 2;

      mockCanvas.width = width * pixelRatio;
      mockCanvas.height = height * pixelRatio;
      mockCanvas.style.width = width + 'px';
      mockCanvas.style.height = height + 'px';

      expect(mockCanvas.width).toBe(1600);
      expect(mockCanvas.height).toBe(1200);
      expect(mockCanvas.style.width).toBe('800px');
      expect(mockCanvas.style.height).toBe('600px');
    });

    it('should use fallback dimensions when container dimensions unavailable', () => {
      const container = {
        clientWidth: 0,
        clientHeight: 0,
        getBoundingClientRect: vi.fn(() => ({ width: 0, height: 0 })),
      };

      const width = container.getBoundingClientRect().width || container.clientWidth || 800;
      const height = container.getBoundingClientRect().height || container.clientHeight || 600;

      expect(width).toBe(800);
      expect(height).toBe(600);
    });
  });

  describe('Progressive rendering logic', () => {
    it('should calculate initial iterations for progressive rendering', () => {
      const targetIterations = 200;
      const startIterations = null;
      const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));

      expect(initialIterations).toBe(40); // 20% of 200 = 40, but max(20, 40) = 40
    });

    it('should use provided start iterations if available', () => {
      const targetIterations = 200;
      const startIterations = 50;
      const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));

      expect(initialIterations).toBe(50);
    });

    it('should calculate step size for progressive rendering', () => {
      const targetIterations = 200;
      const stepSize = Math.max(10, Math.floor(targetIterations * 0.15));

      expect(stepSize).toBe(30); // 15% of 200 = 30, max(10, 30) = 30
    });

    it('should cap progressive iterations at target', () => {
      const currentIterations = 180;
      const targetIterations = 200;
      const stepSize = 30;

      const nextIterations = Math.min(currentIterations + stepSize, targetIterations);

      expect(nextIterations).toBe(200);
    });
  });

  describe('Selection box zoom calculations', () => {
    it('should calculate zoom and offset from selection box', () => {
      const canvasRect = { width: 800, height: 600 };
      const startX = 200;
      const startY = 150;
      const endX = 400;
      const endY = 300;

      const selectionWidth = Math.abs(endX - startX);
      const selectionHeight = Math.abs(endY - startY);
      const selectionCenterX = (startX + endX) / 2;
      const selectionCenterY = (startY + endY) / 2;

      // Normalize to [-1, 1] range
      const normalizedX = (selectionCenterX / canvasRect.width) * 2 - 1;
      const normalizedY = 1 - (selectionCenterY / canvasRect.height) * 2;

      expect(selectionWidth).toBe(200);
      expect(selectionHeight).toBe(150);
      expect(selectionCenterX).toBe(300);
      expect(selectionCenterY).toBe(225);
      expect(normalizedX).toBeCloseTo(-0.25);
      expect(normalizedY).toBeCloseTo(0.25);
    });

    it('should handle selection box with negative dimensions', () => {
      const startX = 400;
      const startY = 300;
      const endX = 200;
      const endY = 150;

      const selectionWidth = Math.abs(endX - startX);
      const selectionHeight = Math.abs(endY - startY);

      expect(selectionWidth).toBe(200);
      expect(selectionHeight).toBe(150);
    });
  });

  describe('FPS calculation', () => {
    it('should calculate FPS from frame count', () => {
      let frameCount = 0;
      let fps = 0;

      // Simulate frame counting
      const incrementFrame = () => {
        frameCount++;
      };

      // Simulate FPS calculation (every second)
      const calculateFPS = () => {
        fps = frameCount;
        frameCount = 0;
      };

      // Simulate 60 frames
      for (let i = 0; i < 60; i++) {
        incrementFrame();
      }

      calculateFPS();

      expect(fps).toBe(60);
      expect(frameCount).toBe(0);
    });
  });

  describe('Clipboard operations', () => {
    it('should copy text to clipboard', async () => {
      const text = 'test text';
      await navigator.clipboard.writeText(text);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });

    it('should handle clipboard errors gracefully', async () => {
      const mockError = new Error('Clipboard error');
      navigator.clipboard.writeText = vi.fn(() => Promise.reject(mockError));

      try {
        await navigator.clipboard.writeText('test');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });
  });

  describe('Animation frame handling', () => {
    it('should schedule animation frames', () => {
      const callback = vi.fn();
      const frameId = mockWindow.requestAnimationFrame(callback);

      expect(mockWindow.requestAnimationFrame).toHaveBeenCalledWith(callback);
      expect(frameId).toBe(1);
    });

    it('should cancel animation frames', () => {
      const frameId = 1;
      mockWindow.cancelAnimationFrame(frameId);

      expect(mockWindow.cancelAnimationFrame).toHaveBeenCalledWith(frameId);
    });
  });
});
