import * as THREE from 'three';
import { getColor } from '../utils.js';

function mandelbulbIterations(x, y, z, params) {
  let zx = x,
    zy = y,
    zz = z;
  let dr = 1.0;
  let r = 0;

  for (let i = 0; i < params.iterations; i++) {
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (r > 2) return i;

    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    dr = Math.pow(r, params.power - 1) * params.power * dr + 1;

    const zr = Math.pow(r, params.power);
    const newTheta = theta * params.power;
    const newPhi = phi * params.power;

    zx = zr * Math.sin(newTheta) * Math.cos(newPhi) + x;
    zy = zr * Math.sin(newTheta) * Math.sin(newPhi) + y;
    zz = zr * Math.cos(newTheta) + z;
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
        const iterations = mandelbulbIterations(x, y, z, params);
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
