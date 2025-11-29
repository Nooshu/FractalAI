import { describe, it, expect, beforeEach } from 'vitest';
import { initLoadingBar, showLoadingBar, hideLoadingBar } from '../../static/js/ui/loading-bar.js';

describe('loading-bar module', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="loading-bar" class="loading-bar"></div>';
  });

  it('initializes and caches the loading bar element', () => {
    const el = initLoadingBar();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('loading-bar');

    // Second call should return same element without querying DOM again
    const el2 = initLoadingBar();
    expect(el2).toBe(el);
  });

  it('showLoadingBar toggles active class', () => {
    const el = initLoadingBar();
    el.classList.add('active');

    showLoadingBar();
    expect(el.classList.contains('active')).toBe(true);
  });

  it('hideLoadingBar removes active class', () => {
    const el = initLoadingBar();
    el.classList.add('active');

    hideLoadingBar();
    expect(el.classList.contains('active')).toBe(false);
  });
});
