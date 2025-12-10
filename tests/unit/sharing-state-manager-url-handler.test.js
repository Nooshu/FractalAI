import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../static/js/sharing/encoder.js', () => ({
  encodeFractalState: vi.fn(() => 'encoded-seed'),
}));

vi.mock('../../static/js/sharing/decoder.js', () => ({
  decodeFractalState: vi.fn(() => ({
    fractalType: 'mandelbrot',
    zoom: 2,
    iterations: 200,
    colorScheme: 'classic',
    offsetX: -0.5,
    offsetY: 0.1,
    xScale: 1,
    yScale: 1,
    juliaCX: 0,
    juliaCY: 0,
  })),
}));

import {
  getShareableURL as getShareableURLState,
  getShareableSeed as getShareableSeedState,
  applyFractalState,
  loadFractalFromURL as loadFractalFromURLState,
} from '../../static/js/sharing/state-manager.js';

import {
  getShareableURL as getShareableURLHandler,
  getShareableSeed as getShareableSeedHandler,
  loadFractalFromURL as loadFractalFromURLHandler,
} from '../../static/js/sharing/url-handler.js';

describe('url-handler module', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/path'),
      writable: true,
      configurable: true,
    });
  });

  it('builds shareable URL and seed via handler', () => {
    const encodeMock = vi.fn(() => 'abc123');
    const params = { zoom: 1 };

    const url = getShareableURLHandler('mandelbrot', params, encodeMock);
    const seed = getShareableSeedHandler('mandelbrot', params, encodeMock);

    expect(encodeMock).toHaveBeenCalled();
    expect(url).toContain('seed=');
    expect(seed).toBe('abc123');
  });

  it('loads state from URL search params', () => {
    // Set search params with a dummy seed (decodeFractalState is mocked)
    // Use Object.defineProperty to avoid jsdom navigation warning
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/path?seed=dummy'),
      writable: true,
      configurable: true,
    });
    const state = loadFractalFromURLHandler();
    expect(state).not.toBeNull();
    expect(state.fractalType).toBe('mandelbrot');
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });
});

describe('state-manager module', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/path'),
      writable: true,
      configurable: true,
    });
  });

  it('builds shareable URL and seed via state manager', () => {
    const params = { zoom: 1 };
    const url = getShareableURLState('mandelbrot', params);
    const seed = getShareableSeedState('mandelbrot', params);

    expect(url).toContain('seed=');
    expect(seed).toBe('encoded-seed');
  });

  it('applies decoded fractal state to params and DOM', async () => {
    document.body.innerHTML = `
      <select id="fractal-type">
        <option value="mandelbrot">Mandelbrot</option>
        <option value="julia">Julia</option>
      </select>
      <input id="iterations" />
      <span id="iterations-value"></span>
      <span id="fullscreen-iterations-number"></span>
      <select id="color-scheme">
        <option value="classic">classic</option>
      </select>
      <input id="x-scale" />
      <span id="x-scale-value"></span>
      <span id="x-scale-announce"></span>
      <input id="y-scale" />
      <span id="y-scale-value"></span>
      <span id="y-scale-announce"></span>
      <input id="julia-c-real" />
      <span id="julia-c-real-value"></span>
      <input id="julia-c-imag" />
      <span id="julia-c-imag-value"></span>
    `;

    const params = {
      zoom: 1,
      iterations: 125,
      colorScheme: 'classic',
      offset: { x: 0, y: 0 },
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
    };

    const getters = {
      getCurrentFractalType: () => 'mandelbrot',
      getCurrentFractalModule: () => ({}),
      getParams: () => params,
    };

    const setters = {
      setFractalType: vi.fn(),
      loadFractal: vi.fn(async () => {}),
      updateWikipediaLink: vi.fn(),
      updateCoordinateDisplay: vi.fn(),
      renderFractal: vi.fn(),
    };

    const decodedState = {
      fractalType: 'mandelbrot',
      zoom: 2,
      iterations: 200,
      colorScheme: 'classic',
      offsetX: -0.5,
      offsetY: 0.1,
      xScale: 1.2,
      yScale: 0.8,
      juliaCX: 0.1,
      juliaCY: -0.2,
    };

    const applied = await applyFractalState(decodedState, getters, setters);
    expect(applied).toBe(true);
    expect(params.zoom).toBe(2);
    expect(params.iterations).toBe(200);
    expect(params.offset.x).toBeCloseTo(-0.5);
    expect(params.offset.y).toBeCloseTo(0.1);
  });

  it('loadFractalFromURL returns false when no state', async () => {
    // Ensure no seed in URL - use Object.defineProperty to avoid jsdom navigation warning
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/path'),
      writable: true,
      configurable: true,
    });
    const getters = {
      getCurrentFractalType: () => 'mandelbrot',
      getCurrentFractalModule: () => ({}),
      getParams: () => ({}),
    };
    const setters = {
      setFractalType: vi.fn(),
      loadFractal: vi.fn(),
      updateWikipediaLink: vi.fn(),
      updateCoordinateDisplay: vi.fn(),
      renderFractal: vi.fn(),
    };
    const result = await loadFractalFromURLState(getters, setters);
    expect(result).toBe(false);
  });
});
