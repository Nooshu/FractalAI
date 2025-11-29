import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateDebugDisplay, setupDebugCopy } from '../../static/js/ui/debug-display.js';

describe('debug-display module', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="debug-fractal-name"></div>
      <div id="debug-zoom"></div>
      <div id="debug-offset-x"></div>
      <div id="debug-offset-y"></div>
      <button id="debug-copy-fractal-name"></button>
      <button id="debug-copy-zoom"></button>
      <button id="debug-copy-offset-x"></button>
      <button id="debug-copy-offset-y"></button>
      <button id="debug-copy-all"></button>
    `;
  });

  it('updates debug display elements with formatted values', () => {
    const params = {
      zoom: 1.23456,
      offset: { x: -0.123456, y: 0.987654 },
    };

    updateDebugDisplay('mandelbrot', params);

    expect(document.getElementById('debug-fractal-name').textContent).toBe('mandelbrot');
    expect(document.getElementById('debug-zoom').textContent).toBe('1.235');
    expect(document.getElementById('debug-offset-x').textContent).toBe('-0.1235');
    expect(document.getElementById('debug-offset-y').textContent).toBe('0.9877');
  });

  it('wires up copy buttons to navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    // @ts-ignore
    global.navigator.clipboard = { writeText };

    const getCurrentFractalType = () => 'mandelbrot';
    const getParams = () => ({
      zoom: 2.5,
      offset: { x: -0.75, y: 0.1 },
    });

    setupDebugCopy(getCurrentFractalType, getParams);

    document.getElementById('debug-copy-fractal-name').click();
    expect(writeText).toHaveBeenCalledWith('mandelbrot');

    document.getElementById('debug-copy-zoom').click();
    expect(writeText).toHaveBeenCalledWith('2.5');

    document.getElementById('debug-copy-offset-x').click();
    expect(writeText).toHaveBeenCalledWith('-0.75');

    document.getElementById('debug-copy-offset-y').click();
    expect(writeText).toHaveBeenCalledWith('0.1');
  });
});
