import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheElement, clearCache } from '../../static/js/core/dom-cache.js';
import {
  updateCoordinateDisplay,
  setupCoordinateCopy,
  updateCoordinateAndDebugDisplay,
} from '../../static/js/ui/coordinate-display.js';
import * as debugDisplay from '../../static/js/ui/debug-display.js';

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

  it('updateCoordinateAndDebugDisplay calls debug-display with correct arguments', () => {
    const spy = vi.spyOn(debugDisplay, 'updateDebugDisplay');

    const params = {
      zoom: 3.0,
      offset: { x: 0.1, y: -0.2 },
    };
    const getParams = () => params;
    const getCurrentFractalType = () => 'julia';

    updateCoordinateAndDebugDisplay(getParams, getCurrentFractalType);

    expect(spy).toHaveBeenCalledWith('julia', params);
  });
});
