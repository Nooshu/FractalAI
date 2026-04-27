/**
 * Pixel ratio management for canvas rendering
 * Handles dynamic pixel ratio adjustment based on zoom level
 */

import { CONFIG } from '../core/config.js';

function isCoarsePointerDevice() {
  try {
    return window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  } catch {
    return false;
  }
}

function isMobileViewport() {
  try {
    return window.matchMedia?.('(width <= 768px)')?.matches ?? false;
  } catch {
    return false;
  }
}

function getMobileDprCap() {
  // Best-practice heuristic: limit DPR on mobile to keep fragment workload reasonable.
  // Use deviceMemory (when available) to be more conservative on low-memory devices.
  const mem = Number(navigator?.deviceMemory);
  if (Number.isFinite(mem) && mem > 0) {
    if (mem <= 2) return 1.25;
    if (mem <= 4) return 1.5;
  }
  return 1.75;
}

function getEffectiveBasePixelRatio() {
  const configured = CONFIG.canvas.basePixelRatio;
  const dpr = window.devicePixelRatio || 1;
  const base = configured || dpr;

  const isMobileLike = isCoarsePointerDevice() && isMobileViewport();
  if (!isMobileLike) return base;

  return Math.min(base, getMobileDprCap());
}

/**
 * Calculate pixel ratio based on zoom level
 * Higher zoom = higher pixel ratio for better quality
 * @param {number} zoom - Current zoom level
 * @returns {number} Calculated pixel ratio
 */
export function calculatePixelRatio(zoom) {
  // Scale pixel ratio with zoom, but cap it to avoid performance issues
  // Base pixel ratio * sqrt(zoom) gives a good balance
  const basePixelRatio = getEffectiveBasePixelRatio();
  const zoomMultiplier = Math.min(Math.sqrt(zoom), CONFIG.canvas.maxPixelRatio);

  // During touch interactions (pan/pinch), drop internal resolution for responsiveness.
  // This is toggled by the input controls (mobile only).
  const interactionScale = globalThis.__fractalaiMobileInteractionActive ? 0.65 : 1.0;

  return basePixelRatio * zoomMultiplier * interactionScale;
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
