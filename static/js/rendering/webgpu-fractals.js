/**
 * WebGPU-first fractal type selection
 *
 * For now we focus on the Mandelbrot family (Mandelbrot / Julia / Multibrot).
 */

const WEBGPU_FIRST_FRACTALS = new Set([
  'mandelbrot',
  'julia',
  'multibrot',
  'multibrot-julia',
]);

export function isWebGPUFirstFractalType(fractalType) {
  return WEBGPU_FIRST_FRACTALS.has(fractalType);
}

