/**
 * DOM Cache Module
 * Simple utility for caching frequently accessed DOM elements
 */

// Internal cache storage
const cache = new Map();

/**
 * Initialize and cache a DOM element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The cached element or null if not found
 */
export function cacheElement(id) {
  if (!cache.has(id)) {
    const element = document.getElementById(id);
    if (element) {
      cache.set(id, element);
    }
    return element;
  }
  return cache.get(id);
}

/**
 * Get a cached element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The cached element or null if not found
 */
export function getElement(id) {
  return cache.get(id) || null;
}

/**
 * Initialize multiple elements at once
 * @param {string[]} ids - Array of element IDs to cache
 * @returns {Object} Object mapping IDs to elements
 */
export function initCache(ids) {
  const elements = {};
  for (const id of ids) {
    const element = cacheElement(id);
    if (element) {
      elements[id] = element;
    }
  }
  return elements;
}

/**
 * Clear the cache (useful for testing or cleanup)
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get all cached elements
 * @returns {Map} Map of all cached elements
 */
export function getAllCached() {
  return new Map(cache);
}
