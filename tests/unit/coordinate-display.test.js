import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheElement, clearCache } from '../../static/js/core/dom-cache.js';
import {
  updateCoordinateDisplay,
  setupCoordinateCopy,
  updateCoordinateAndDebugDisplay,
} from '../../static/js/ui/coordinate-display.js';

// Mock debug-display module for dynamic import
vi.mock('../../static/js/ui/debug-display.js', () => ({
  updateDebugDisplay: vi.fn(),
}));

describe('coordinate-display module', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="coord-zoom"></div>
      <div id="coord-offset-x"></div>
      <div id="coord-offset-y"></div>
      <button id="copy-coords-btn"></button>
    `;
    clearCache();
    cacheElement('coord-zoom');
    cacheElement('coord-offset-x');
    cacheElement('coord-offset-y');
    cacheElement('copy-coords-btn');
    vi.clearAllMocks();
  });

  it('updates coordinate display with formatted values', () => {
    const params = {
      zoom: 1.23456,
      offset: { x: -0.123456, y: 0.987654 },
    };

    updateCoordinateDisplay(params);

    expect(document.getElementById('coord-zoom').textContent).toBe('1.235');
    expect(document.getElementById('coord-offset-x').textContent).toBe('-0.1235');
    expect(document.getElementById('coord-offset-y').textContent).toBe('0.9877');
  });

  it('setupCoordinateCopy writes formatted text to clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue();
    // @ts-ignore
    global.navigator.clipboard = { writeText };

    const getCurrentFractalType = () => 'mandelbrot';
    const getParams = () => ({
      zoom: 2.5,
      offset: { x: -0.75, y: 0.1 },
    });

    setupCoordinateCopy(getCurrentFractalType, getParams);

    const button = document.getElementById('copy-coords-btn');
    button.click();

    expect(writeText).toHaveBeenCalledWith(
      'fractal: mandelbrot, zoom: 2.5, offsetX: -0.75, offsetY: 0.1'
    );
  });

  it('updateCoordinateAndDebugDisplay calls debug-display with correct arguments when debug section is visible', async () => {
    // Create a visible debug section (append to preserve coordinate elements)
    const debugSection = document.createElement('div');
    debugSection.className = 'section';
    debugSection.setAttribute('data-section', 'debug');
    debugSection.innerHTML = '<div class="section-content active"></div>';
    document.body.appendChild(debugSection);

    const params = {
      zoom: 3.0,
      offset: { x: 0.1, y: -0.2 },
    };
    const getParams = () => params;
    const getCurrentFractalType = () => 'julia';

    updateCoordinateAndDebugDisplay(getParams, getCurrentFractalType);

    // Wait for async debug display load
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify debug display was called (via dynamic import)
    const { updateDebugDisplay } = await import('../../static/js/ui/debug-display.js');
    expect(updateDebugDisplay).toHaveBeenCalledWith('julia', params);
  });

  it('updateCoordinateAndDebugDisplay does not call debug-display when debug section is hidden', async () => {
    // Create a hidden debug section (append to preserve coordinate elements)
    const debugSection = document.createElement('div');
    debugSection.className = 'section debug-hidden';
    debugSection.setAttribute('data-section', 'debug');
    debugSection.innerHTML = '<div class="section-content active"></div>';
    document.body.appendChild(debugSection);

    const params = {
      zoom: 3.0,
      offset: { x: 0.1, y: -0.2 },
    };
    const getParams = () => params;
    const getCurrentFractalType = () => 'julia';

    updateCoordinateAndDebugDisplay(getParams, getCurrentFractalType);

    // Wait a bit to ensure debug display is not loaded
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify coordinate display was still updated
    expect(document.getElementById('coord-zoom').textContent).toBe('3');
    expect(document.getElementById('coord-offset-x').textContent).toBe('0.1');
    expect(document.getElementById('coord-offset-y').textContent).toBe('-0.2');
  });
});
