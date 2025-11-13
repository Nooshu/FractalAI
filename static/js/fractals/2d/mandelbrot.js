import * as THREE from 'three';
import { vertexShader, createFragmentShader, getColorSchemeIndex } from '../utils.js';

const fractalFunction = `
    int computeFractal(vec2 c) {
        vec2 z = vec2(0.0);
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            if (dot(z, z) > 4.0) return i;
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        }
        return int(uIterations);
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(scene, camera, renderer, params, fractalPlane) {
  scene.clear();

  // Always recreate the plane to ensure shader uniforms are properly updated
  if (fractalPlane) {
    fractalPlane.geometry.dispose();
    fractalPlane.material.dispose();
    fractalPlane = null;
  }

  // Get the container size to match camera bounds exactly
  const container = renderer.domElement.parentElement;
  const containerRect = container.getBoundingClientRect();
  const aspect =
    (containerRect.width || renderer.domElement.width) /
    (containerRect.height || renderer.domElement.height);
  const viewSize = 2;
  const geometry = new THREE.PlaneGeometry(viewSize * 2 * aspect, viewSize * 2);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIterations: { value: params.iterations },
      uZoom: { value: params.zoom },
      uOffset: { value: new THREE.Vector2(params.offset.x, params.offset.y) },
      uResolution: {
        value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      },
      uJuliaC: { value: new THREE.Vector2(0, 0) }, // Not used for Mandelbrot
      uColorScheme: { value: getColorSchemeIndex(params.colorScheme) },
      uXScale: { value: params.xScale },
      uYScale: { value: params.yScale },
    },
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(0, 0, 0);
  scene.add(plane);

  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  return plane;
}

export const is2D = true;
