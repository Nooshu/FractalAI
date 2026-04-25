import { LumaFractalRenderer, createLumaFragmentShader } from '../rendering/luma-fractal-renderer.js';

const rendererCache = new WeakMap();

export function getLumaRenderer(device) {
  if (!device) return null;
  if (rendererCache.has(device)) return rendererCache.get(device);
  const renderer = new LumaFractalRenderer(device);
  rendererCache.set(device, renderer);
  return renderer;
}

export function createLumaDrawCommand(device, cacheKey, fractalFunction, params, canvas) {
  const renderer = getLumaRenderer(device);
  if (!renderer) return null;
  const fragment = createLumaFragmentShader(fractalFunction);
  const draw = renderer.getDrawCommand(cacheKey, fragment, params, canvas);
  draw.supportsProgressiveParams = true;
  return draw;
}

