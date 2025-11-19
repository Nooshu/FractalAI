/**
 * URL parameter handling for fractal sharing
 * Handles loading fractal state from URL parameters
 */

import { decodeFractalState } from './decoder.js';

/**
 * Get shareable URL with encoded fractal state
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @param {Function} encodeState - Function to encode state
 * @returns {string} Shareable URL
 */
export function getShareableURL(fractalType, params, encodeState) {
  const seed = encodeState(fractalType, params);
  // Use origin and pathname to ensure we get a clean URL without existing query params
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('seed', seed);
  return url.toString();
}

/**
 * Get shareable seed string
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @param {Function} encodeState - Function to encode state
 * @returns {string} Encoded seed string
 */
export function getShareableSeed(fractalType, params, encodeState) {
  return encodeState(fractalType, params);
}

/**
 * Load fractal state from URL
 * @returns {Object|null} Decoded state object or null if not found
 */
export function loadFractalFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  let seed = urlParams.get('seed');

  // Also check URL hash for seed (alternative format)
  if (!seed && window.location.hash) {
    const hash = window.location.hash.substring(1); // Remove #
    // Check if hash looks like a seed (base64-like string)
    if (hash.length > 10 && /^[A-Za-z0-9_-]+$/.test(hash)) {
      seed = hash;
    }
  }

  if (seed) {
    // Decode the seed (it might be URL encoded)
    try {
      seed = decodeURIComponent(seed);
    } catch {
      // If decoding fails, use the seed as-is
    }
    
    const state = decodeFractalState(seed);
    if (state) {
      return state;
    } else {
      console.warn('Failed to decode fractal state from URL seed:', seed);
    }
  }

  return null;
}

