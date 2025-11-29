import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateFooterHeight, initFooterHeightTracking } from '../../static/js/ui/footer-height.js';

describe('footer-height module', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <footer class="app-footer" style="height: 40px;"></footer>
      <div class="footer-share-description"></div>
      <button id="share-fractal-btn"></button>
    `;
    // jsdom doesn't calculate layout, so we mock offsetHeight
    const footer = document.querySelector('.app-footer');
    Object.defineProperty(footer, 'offsetHeight', {
      configurable: true,
      value: 40,
    });
    document.documentElement.style.setProperty('--footer-height', '');
  });

  it('updates CSS variable based on footer height', () => {
    updateFooterHeight();
    expect(document.documentElement.style.getPropertyValue('--footer-height')).toBe('40px');
  });

  it('initFooterHeightTracking attaches resize listener and observer', () => {
    const resizeObserverObserve = vi.fn();

    class ResizeObserverMock {
      static instances = [];

      constructor(callback) {
        this.callback = callback;
        ResizeObserverMock.instances.push(this);
      }

      observe(target) {
        resizeObserverObserve(target);
      }
    }

    // @ts-ignore
    global.ResizeObserver = ResizeObserverMock;

    // Force readyState to "complete" so setup runs immediately
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get() {
        return 'complete';
      },
    });

    initFooterHeightTracking();

    expect(ResizeObserverMock.instances.length).toBe(1);
    expect(resizeObserverObserve).toHaveBeenCalled();

    // Trigger resize to ensure handler doesn't throw and updates CSS variable
    const footer = document.querySelector('.app-footer');
    Object.defineProperty(footer, 'offsetHeight', {
      configurable: true,
      value: 55,
    });
    window.dispatchEvent(new Event('resize'));
    expect(document.documentElement.style.getPropertyValue('--footer-height')).toBe('55px');
  });
});
