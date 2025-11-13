import * as THREE from 'three';
import { vertexShader, createFragmentShader, getColorSchemeIndex } from '../utils.js';

const fractalFunction = `
    int computeFractal(vec2 c) {
        // Optimized Mandelbrot with early bailout and better precision
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0-2: manual unroll
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 0;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 1;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 2;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > 4.0) return i;
            
            // Optimized complex multiplication: (a+bi)^2 = (a^2-b^2) + 2abi
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
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
