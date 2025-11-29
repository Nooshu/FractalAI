import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initFPSTracker,
  startFPSTracking,
  stopFPSTracking,
  incrementFrameCount,
  getFPS,
  getFrameCount,
} from '../../static/js/performance/fps-tracker.js';

describe('fps-tracker module', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="fps"></div>';
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopFPSTracking();
    vi.useRealTimers();
  });

  it('initializes with element id', () => {
    const el = initFPSTracker('fps');
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('fps');
  });

  it('initializes with element instance', () => {
    const el = document.getElementById('fps');
    const result = initFPSTracker(el);
    expect(result).toBe(el);
  });

  it('tracks FPS over time', () => {
    const el = initFPSTracker('fps');
    startFPSTracking();

    // Simulate 42 frames in one second
    for (let i = 0; i < 42; i++) {
      incrementFrameCount();
    }

    vi.advanceTimersByTime(1000);

    expect(getFPS()).toBe(42);
    expect(el.textContent).toBe('FPS: 42');
    // frameCount should have been reset
    expect(getFrameCount()).toBe(0);
  });

  it('stopFPSTracking clears interval without throwing', () => {
    initFPSTracker('fps');
    startFPSTracking();

    expect(() => stopFPSTracking()).not.toThrow();
  });

  it('incrementFrameCount increases frame count', () => {
    initFPSTracker('fps');
    startFPSTracking();

    expect(getFrameCount()).toBe(0);
    incrementFrameCount();
    incrementFrameCount();
    expect(getFrameCount()).toBe(2);
  });
});
