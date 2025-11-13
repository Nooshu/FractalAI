import * as THREE from 'three';
import { getColor } from '../utils.js';

function julia3DIterations(x, y, z, params) {
  let zx = x,
    zy = y,
    zz = z;
  const cx = params.juliaC.x;
  const cy = params.juliaC.y;
  const cz = 0.4;

  for (let i = 0; i < params.iterations; i++) {
    const r2 = zx * zx + zy * zy + zz * zz;
    if (r2 > 4) return i;

    const r = Math.sqrt(r2);
    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);

    const newR = Math.pow(r, params.power);
    const newTheta = theta * params.power;
    const newPhi = phi * params.power;

    zx = newR * Math.sin(newTheta) * Math.cos(newPhi) + cx;
    zy = newR * Math.sin(newTheta) * Math.sin(newPhi) + cy;
    zz = newR * Math.cos(newTheta) + cz;
  }

  return params.iterations;
}

export function render(scene, camera, renderer, params) {
  scene.clear();

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const size = 2;
  const step = size / params.resolution;
  const halfSize = size / 2;

  for (let x = -halfSize; x < halfSize; x += step) {
    for (let y = -halfSize; y < halfSize; y += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        const iterations = julia3DIterations(x, y, z, params);
        if (iterations < params.iterations) {
          positions.push(x, y, z);
          const color = getColor(iterations, params.iterations, params.colorScheme);
          colors.push(color.r, color.g, color.b);
        }
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  renderer.render(scene, camera);
}

export const is2D = false;
