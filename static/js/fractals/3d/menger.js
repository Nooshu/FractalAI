import * as THREE from 'three';

export function render(scene, camera, renderer, params) {
  scene.clear();

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
  });

  function mengerSponge(mesh, level, maxLevel) {
    if (level >= maxLevel) {
      scene.add(mesh);
      return;
    }

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const sum = Math.abs(x) + Math.abs(y) + Math.abs(z);
          if (sum > 1) {
            const child = mesh.clone();
            child.scale.multiplyScalar(1 / 3);
            child.position.set((x * 2) / 3, (y * 2) / 3, (z * 2) / 3);
            mengerSponge(child, level + 1, maxLevel);
          }
        }
      }
    }
  }

  const maxLevel = Math.min(4, Math.floor(params.iterations / 25));
  mengerSponge(new THREE.Mesh(geometry, material), 0, maxLevel);

  renderer.render(scene, camera);
}

export const is2D = false;
