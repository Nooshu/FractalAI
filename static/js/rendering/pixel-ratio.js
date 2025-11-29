/**
 * Pixel ratio management for canvas rendering
 * Handles dynamic pixel ratio adjustment based on zoom level
 */

import { CONFIG } from '../core/config.js';

/**
 * Calculate pixel ratio based on zoom level
 * Higher zoom = higher pixel ratio for better quality
 * @param {number} zoom - Current zoom level
 * @returns {number} Calculated pixel ratio
 */
export function calculatePixelRatio(zoom) {
  // Scale pixel ratio with zoom, but cap it to avoid performance issues
  // Base pixel ratio * sqrt(zoom) gives a good balance
  const basePixelRatio = CONFIG.canvas.basePixelRatio || window.devicePixelRatio || 1;
  const zoomMultiplier = Math.min(Math.sqrt(zoom), CONFIG.canvas.maxPixelRatio);
  return basePixelRatio * zoomMultiplier;
}

/**
 * Update canvas pixel ratio based on current zoom
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} zoom - Current zoom level
 */
export function updatePixelRatio(canvas, zoom) {
  if (!canvas) return;

  const pixelRatio = calculatePixelRatio(zoom);
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const width = rect.width || container.clientWidth || CONFIG.canvas.defaultWidth;
  const height = rect.height || container.clientHeight || CONFIG.canvas.defaultHeight;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}
