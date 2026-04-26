import { Device, luma } from '@luma.gl/core';
import { webgl2Adapter } from '@luma.gl/webgl';

let adaptersRegistered = false;

function ensureAdaptersRegistered() {
  if (adaptersRegistered) return;
  // Required so luma.gl can construct WebGLDevice wrappers.
  luma.registerAdapters([webgl2Adapter]);
  adaptersRegistered = true;
}

/**
 * Attach a luma.gl Device to an existing WebGL2 context.
 * This lets us incrementally render a subset of fractals through luma.gl while
 * keeping the existing regl-managed context.
 */
export function attachLumaDevice(gl) {
  if (!gl) return null;
  ensureAdaptersRegistered();
  try {
    return Device.attach(gl);
  } catch {
    return null;
  }
}

