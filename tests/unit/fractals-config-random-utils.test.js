import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  getWikipediaUrl,
  updateWikipediaLink,
  getInitialRenderPosition,
} from '../../static/js/fractals/fractal-config.js';

import {
  isValidInterestingView,
} from '../../static/js/fractals/random-view.js';

import {
  computeColorForScheme,
  generatePaletteTexture,
  clearPaletteCache,
  createCachedShaderDrawCommand,
  clearShaderCache,
  isJuliaType,
  getColorSchemeIndex,
  getColor,
} from '../../static/js/fractals/utils.js';

describe('fractal-config module', () => {
  it('returns Wikipedia URL for known fractal', () => {
    const url = getWikipediaUrl('mandelbrot');
    expect(url).toContain('Mandelbrot_set');
  });

  it('updateWikipediaLink updates anchor href', () => {
    document.body.innerHTML = `
      <a id="wikipedia-link" href="#"></a>
    `;
    updateWikipediaLink(() => 'mandelbrot');
    const link = document.getElementById('wikipedia-link');
    expect(link.href).toContain('Mandelbrot_set');
  });

  it('getInitialRenderPosition returns default shape', () => {
    const pos = getInitialRenderPosition('unknown-type');
    expect(pos).toHaveProperty('zoom');
    expect(pos).toHaveProperty('offset');
  });
});

describe('random-view module', () => {
  let canvas;

  beforeEach(() => {
    canvas = { width: 800, height: 600 };
  });

  // Note: removeDuplicatePoints, generateRandomInterestingPoint, and getRandomInterestingView
  // have been removed/deprecated in favor of ML-based discovery

  it('isValidInterestingView returns boolean', () => {
    const valid = isValidInterestingView(
      { x: 0, y: 0 },
      1,
      'mandelbrot',
      () => ({
        iterations: 50,
        xScale: 1,
        yScale: 1,
        juliaC: { x: 0, y: 0 },
      }),
      () => canvas
    );
    expect(typeof valid).toBe('boolean');
  });
});

describe('fractals utils module', () => {
  it('computeColorForScheme clamps values to [0,1]', () => {
    const color = computeColorForScheme(2, 0);
    expect(color[0]).toBeGreaterThanOrEqual(0); // r
    expect(color[0]).toBeLessThanOrEqual(1);
    expect(color[1]).toBeGreaterThanOrEqual(0); // g
    expect(color[1]).toBeLessThanOrEqual(1);
    expect(color[2]).toBeGreaterThanOrEqual(0); // b
    expect(color[2]).toBeLessThanOrEqual(1);
    expect(color).toBeInstanceOf(Float32Array);
  });

  it('getColorSchemeIndex returns an index for known scheme', () => {
    const idx = getColorSchemeIndex('classic');
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  it('getColor returns black for max iterations', () => {
    const color = getColor(100, 100, 'classic');
    expect(color).toBeInstanceOf(Float32Array);
    expect(color[0]).toBe(0); // r
    expect(color[1]).toBe(0); // g
    expect(color[2]).toBe(0); // b
  });

  it('isJuliaType detects Julia variants', () => {
    expect(isJuliaType('julia')).toBe(true);
    expect(isJuliaType('mandelbrot')).toBe(false);
  });

  it('generatePaletteTexture creates and caches texture', () => {
    const created = [];
    const regl = {
      texture: vi.fn(() => {
        const tex = { destroy: vi.fn() };
        created.push(tex);
        return tex;
      }),
    };

    const texture1 = generatePaletteTexture(regl, 'classic');
    const texture2 = generatePaletteTexture(regl, 'classic');
    expect(texture1).toBe(texture2);

    clearPaletteCache();
    expect(created[0].destroy).toHaveBeenCalled();
  });

  it('createCachedShaderDrawCommand caches factory functions', () => {
    const calls = [];
    const regl = vi.fn((cfg) => {
      calls.push(cfg);
      return () => {};
    });

    const factory1 = createCachedShaderDrawCommand(regl, 'mandelbrot', 'vert', 'frag', {
      attributes: {},
    });
    const factory2 = createCachedShaderDrawCommand(regl, 'mandelbrot', 'vert', 'frag', {
      attributes: {},
    });

    expect(factory1).toBe(factory2);
    const draw = factory1({ uZoom: 1 });
    expect(typeof draw).toBe('function');

    clearShaderCache();
  });
});
