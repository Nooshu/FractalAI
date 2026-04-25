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
  'burning-ship-julia',
  // NOTE: tricorn-julia is still WebGL for now (snapshot mismatch)
  'phoenix-julia',
  'lambda-julia',
  'hybrid-julia',
  // Sierpinski family (WebGPU-first)
  // NOTE: If any of these regress in snapshots, move them back to WebGL.
  'menger-carpet',
  'sierpinski-pentagon',
  'sierpinski-tetrahedron',
  'sierpinski-gasket',
  'sierpinski-arrowhead',
  'sierpinski-curve',
  'sierpinski-lsystem',
  // Koch family (WebGPU-first)
  'koch',
  'quadratic-koch',
  'fractal-islands',
]);

export function isWebGPUFirstFractalType(fractalType) {
  return WEBGPU_FIRST_FRACTALS.has(fractalType);
}

