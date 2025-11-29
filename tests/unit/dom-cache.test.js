import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheElement,
  getElement,
  initCache,
  clearCache,
  getAllCached,
} from '../../static/js/core/dom-cache.js';

describe('dom-cache module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearCache();
  });

  it('caches elements by id and returns them', () => {
    const el = document.createElement('div');
    el.id = 'test-el';
    document.body.appendChild(el);

    const cachedFirst = cacheElement('test-el');
    const cachedSecond = cacheElement('test-el');

    expect(cachedFirst).toBe(el);
    expect(cachedSecond).toBe(el);
    expect(getElement('test-el')).toBe(el);
  });

  it('returns null when element does not exist', () => {
    expect(cacheElement('missing-el')).toBeNull();
    expect(getElement('missing-el')).toBeNull();
  });

  it('initCache caches multiple ids and returns a map-like object', () => {
    const ids = ['a', 'b', 'c'];
    ids.forEach((id) => {
      const el = document.createElement('span');
      el.id = id;
      document.body.appendChild(el);
    });

    const elements = initCache(ids);

    ids.forEach((id) => {
      expect(elements[id]).toBeInstanceOf(HTMLElement);
      expect(getElement(id)).toBe(elements[id]);
    });
  });

  it('clearCache removes all cached elements', () => {
    const el = document.createElement('div');
    el.id = 'to-clear';
    document.body.appendChild(el);

    cacheElement('to-clear');
    expect(getElement('to-clear')).toBe(el);

    clearCache();
    expect(getElement('to-clear')).toBeNull();
    expect(getAllCached().size).toBe(0);
  });

  it('getAllCached returns a copy of the cache map', () => {
    const el = document.createElement('div');
    el.id = 'x';
    document.body.appendChild(el);
    cacheElement('x');

    const allCached = getAllCached();
    expect(allCached).toBeInstanceOf(Map);
    expect(allCached.get('x')).toBe(el);

    // Mutating returned map should not affect internal cache
    allCached.clear();
    expect(getAllCached().size).toBe(1);
  });
});
