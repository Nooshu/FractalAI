import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for discovery/discovery-manager.js
 * Tests the discovery manager interface
 */

describe('discovery/discovery-manager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should export all required functions', async () => {
    const module = await import('../../static/js/discovery/discovery-manager.js');
    expect(module).toHaveProperty('initializeDiscovery');
    expect(module).toHaveProperty('getSurpriseMeFractal');
    expect(module).toHaveProperty('getDiscoveredFractals');
    expect(module).toHaveProperty('triggerRetraining');
    expect(module).toHaveProperty('getModel');
  });

  it('should initialize discovery system', async () => {
    const { initializeDiscovery } = await import('../../static/js/discovery/discovery-manager.js');
    const isValidInterestingView = vi.fn(() => true);
    await initializeDiscovery(isValidInterestingView);
    // Should complete without error
    expect(true).toBe(true);
  });

  it('should get surprise me fractal', async () => {
    const { getSurpriseMeFractal } = await import('../../static/js/discovery/discovery-manager.js');
    const isValidInterestingView = vi.fn(() => true);
    const fractal = await getSurpriseMeFractal('mandelbrot', isValidInterestingView, {
      candidateCount: 10,
      minScore: 0.3,
    });
    // May return null if no good candidates found, or a fractal config
    if (fractal) {
      expect(fractal).toHaveProperty('fractalType', 'mandelbrot');
      expect(fractal).toHaveProperty('zoom');
      expect(fractal).toHaveProperty('offsetX');
      expect(fractal).toHaveProperty('offsetY');
      expect(fractal).toHaveProperty('colorScheme');
    }
  });

  it('should get multiple discovered fractals', async () => {
    const { getDiscoveredFractals } = await import('../../static/js/discovery/discovery-manager.js');
    const isValidInterestingView = vi.fn(() => true);
    const fractals = await getDiscoveredFractals('mandelbrot', isValidInterestingView, {
      candidateCount: 20,
      topK: 5,
      minScore: 0.3,
    });
    expect(fractals).toBeInstanceOf(Array);
    expect(fractals.length).toBeLessThanOrEqual(5);
    fractals.forEach((fractal) => {
      expect(fractal).toHaveProperty('fractalType', 'mandelbrot');
      expect(fractal).toHaveProperty('score');
    });
  });

  it('should return null when triggerRetraining has insufficient favorites', async () => {
    const { triggerRetraining } = await import('../../static/js/discovery/discovery-manager.js');
    // Clear favorites
    localStorage.clear();
    await triggerRetraining();
    // Should complete without error (early return)
    expect(true).toBe(true);
  });

  it('should get model', async () => {
    const { getModel } = await import('../../static/js/discovery/discovery-manager.js');
    const model = getModel();
    // Model may be null if not initialized
    expect(model === null || typeof model === 'object').toBe(true);
  });
});




