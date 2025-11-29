/**
 * Application version
 * This file is generated at build time from package.json
 * The version is injected by Vite during the build process
 */

// Version will be injected by Vite define plugin
// eslint-disable-next-line no-undef
export const APP_VERSION = __APP_VERSION__;

/**
 * Get the full version string for display
 * @returns {string} Version string (e.g., "3.5.0")
 */
export function getVersion() {
  return APP_VERSION;
}

/**
 * Get the version string with "FractalAI v" prefix
 * @returns {string} Version string (e.g., "FractalAI v3.5.0")
 */
export function getVersionString() {
  return `FractalAI v${APP_VERSION}`;
}
