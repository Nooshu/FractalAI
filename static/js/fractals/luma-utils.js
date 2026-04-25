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

function ensureFrameParamsUBO(fragmentSource) {
  if (fragmentSource.includes('uniform FrameParams') || fragmentSource.includes('layout(std140) uniform FrameParams')) {
    return fragmentSource;
  }

  // Replace free uniforms with a FrameParams uniform block.
  let src = fragmentSource;
  src = src.replace(/^\s*uniform\s+float\s+uTime\s*;\s*$/m, '');
  src = src.replace(/^\s*uniform\s+vec2\s+uResolution\s*;\s*$/m, '');

  // Insert FrameParams block after precision lines (best-effort).
  const frameBlock = `
layout(std140) uniform FrameParams {
  float uTime;
  vec2 uResolution;
};
`;

  const precisionMatch = src.match(/precision\s+[a-z]+\s+sampler2D\s*;\s*\n/i);
  if (precisionMatch?.index !== undefined) {
    const insertAt = precisionMatch.index + precisionMatch[0].length;
    src = src.slice(0, insertAt) + '\n' + frameBlock + '\n' + src.slice(insertAt);
    return src;
  }

  // Fallback: insert after #version line.
  const versionMatch = src.match(/^#version\s+300\s+es\s*\n/m);
  if (versionMatch?.index !== undefined) {
    const insertAt = versionMatch.index + versionMatch[0].length;
    src = src.slice(0, insertAt) + '\n' + frameBlock + '\n' + src.slice(insertAt);
    return src;
  }

  return frameBlock + '\n' + src;
}

export function createLumaDrawCommandFromFragmentSource(device, cacheKey, fragmentSource, params, canvas) {
  const renderer = getLumaRenderer(device);
  if (!renderer) return null;
  const fragment = ensureFrameParamsUBO(fragmentSource);
  const draw = renderer.getDrawCommand(cacheKey, fragment, params, canvas);
  draw.supportsProgressiveParams = true;
  return draw;
}

