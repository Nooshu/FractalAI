import { describe, it, beforeEach, vi } from 'vitest';

vi.mock('../../static/js/fractals/utils.js', () => ({
  getColorSchemeIndex: vi.fn(() => 0),
  computeColorForScheme: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
  isJuliaType: vi.fn(() => false),
}));

vi.mock('../../static/js/fractals/fractal-config.js', () => ({
  getInitialRenderPosition: vi.fn(() => ({ zoom: 1, offset: { x: 0, y: 0 } })),
}));

import { setupUIControls } from '../../static/js/ui/controls.js';

describe('ui controls module', () => {
  let getters;
  let setters;
  let dependencies;
  let callbacks;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="fractal-type">
        <option value="mandelbrot">Mandelbrot</option>
        <option value="julia">Julia</option>
      </select>
      <input id="iterations" type="range" value="125" />
      <span id="iterations-value">125</span>
      <select id="color-scheme">
        <option value="classic">classic</option>
      </select>
      <input id="julia-c-real" />
      <span id="julia-c-real-value"></span>
      <input id="julia-c-imag" />
      <span id="julia-c-imag-value"></span>
      <button id="random-view-btn"></button>
      <button id="fullscreen-random-btn"></button>
      <span id="fullscreen-random-number">0</span>
      <button id="reset-view"></button>
      <button id="screenshot"></button>
      <button id="fullscreen"></button>
      <div id="julia-controls"></div>
      <input id="x-scale" />
      <span id="x-scale-value"></span>
      <input id="y-scale" />
      <span id="y-scale-value"></span>
      <button id="update-fractal"></button>
      <input type="checkbox" id="auto-render" />
      <button id="fullscreen-toggle"></button>
      <div id="fullscreen-overlay"></div>
      <canvas id="fractal-canvas"></canvas>
    `;

    const params = {
      iterations: 125,
      zoom: 1,
      offset: { x: 0, y: 0 },
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
      colorScheme: 'classic',
    };

    getters = {
      getParams: () => params,
      getCurrentFractalType: () => 'mandelbrot',
      getCurrentFractalModule: () => ({ config: {} }),
      getDrawFractal: () => null,
      getCachedDrawCommand: () => null,
      getIsDisplayingCached: () => false,
      getRegl: () => ({}),
      getCanvas: () => document.getElementById('fractal-canvas'),
    };

    setters = {
      setCurrentFractalType: vi.fn(),
      setDrawFractal: vi.fn(),
      setCachedDrawCommand: vi.fn(),
      setIsDisplayingCached: vi.fn(),
    };

    dependencies = {
      frameCache: { clear: vi.fn() },
      fractalLoader: {
        getIsLoading: vi.fn(() => false),
        removeFromCache: vi.fn(),
      },
    };

    callbacks = {
      loadFractal: vi.fn(async () => {}),
      updateWikipediaLink: vi.fn(),
      updateCoordinateDisplay: vi.fn(),
      renderFractalProgressive: vi.fn(),
      renderFractal: vi.fn(),
      getRandomInterestingView: vi.fn(() => ({ offset: { x: 0.1, y: -0.2 }, zoom: 2 })),
      cancelProgressiveRender: vi.fn(),
      onFullscreenChange: vi.fn(),
    };
  });

  it('wires up basic UI event handlers', () => {
    const originalGetElementById = document.getElementById.bind(document);

    // Fallback stub element for any IDs not explicitly present
    const makeStubElement = () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: () => {},
      textContent: '',
      value: '',
    });

    document.getElementById = (id) => originalGetElementById(id) || makeStubElement();

    setupUIControls(getters, setters, dependencies, callbacks);

    const fractalTypeSelect = document.getElementById('fractal-type');
    fractalTypeSelect.value = 'julia';
    fractalTypeSelect.dispatchEvent(new Event('change'));

    // Restore original getElementById
    document.getElementById = originalGetElementById;
  });
});


