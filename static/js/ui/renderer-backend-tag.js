let el = null;

function getEl() {
  if (el) return el;
  el = document.getElementById('renderer-backend-tag');
  return el;
}

/**
 * Update the renderer backend label shown above the FPS counter.
 * This is only shown in the main view (the entire info panel is hidden in fullscreen).
 *
 * @param {string | null | undefined} backend - e.g. "WebGPU", "WebGL2", "WebGL"
 */
export function setRendererBackendTag(backend) {
  const target = getEl();
  if (!target) return;
  const value = backend ? String(backend) : '--';
  target.textContent = `Renderer: ${value}`;
}

