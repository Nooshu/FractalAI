import * as THREE from 'three';

// Application state
let scene, camera, renderer;
let camera2D, camera3D; // Separate cameras for 2D and 3D
let currentFractalType = 'mandelbrot';
let is2D = true;
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let fractalPlane = null;

// Fractal parameters
let params = {
  iterations: 100,
  colorScheme: 'classic',
  juliaC: new THREE.Vector2(-0.7269, 0.1889),
  power: 8,
  resolution: 100,
  center: new THREE.Vector2(0, 0),
  zoom: 1,
  offset: new THREE.Vector2(0, 0),
  xScale: 1.0,
  yScale: 1.0,
};

// Initialize Three.js
function init() {
  const canvas = document.getElementById('fractal-canvas');
  const container = canvas.parentElement;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Get container dimensions - ensure we have valid dimensions
  const getContainerSize = () => {
    const rect = container.getBoundingClientRect();
    return {
      width: rect.width || container.clientWidth || 800,
      height: rect.height || container.clientHeight || 600,
    };
  };

  const containerSize = getContainerSize();

  // Camera setup - separate cameras for 2D and 3D
  // 2D: OrthographicCamera to fill viewport exactly
  const aspect = containerSize.width / containerSize.height;
  const viewSize = 2; // Size of the view in world units
  camera2D = new THREE.OrthographicCamera(
    -viewSize * aspect, // left
    viewSize * aspect, // right
    viewSize, // top
    -viewSize, // bottom
    0.1,
    10
  );
  camera2D.position.z = 1;

  // 3D: PerspectiveCamera for 3D fractals
  camera3D = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera3D.position.z = 5;

  // Set active camera based on initial fractal type
  camera = is2D ? camera2D : camera3D;

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  // Function to update renderer size
  const updateRendererSize = () => {
    const size = getContainerSize();
    renderer.setSize(size.width, size.height);

    // Override any inline styles Three.js might set
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const aspect = size.width / size.height;
    const viewSize = 2;

    // Update 2D camera (orthographic)
    camera2D.left = -viewSize * aspect;
    camera2D.right = viewSize * aspect;
    camera2D.top = viewSize;
    camera2D.bottom = -viewSize;
    camera2D.updateProjectionMatrix();

    // Update 3D camera (perspective)
    camera3D.aspect = aspect;
    camera3D.updateProjectionMatrix();
  };

  // Initial size setup
  updateRendererSize();

  // Handle window resize
  window.addEventListener('resize', () => {
    updateRendererSize();
    renderFractal();
  });

  // Use ResizeObserver for more accurate container size tracking
  const resizeObserver = new ResizeObserver(() => {
    updateRendererSize();
    renderFractal();
  });
  resizeObserver.observe(container);

  // Setup controls
  setupControls();
  setupUI();

  // Initial render
  renderFractal();
  animate();
}

function setupControls() {
  const canvas = document.getElementById('fractal-canvas');
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging && is2D) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      params.offset.x -= deltaX * 0.001 * params.zoom;
      params.offset.y += deltaY * 0.001 * params.zoom;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      renderFractal();
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (is2D) {
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      params.zoom *= zoomFactor;
      renderFractal();
    } else {
      camera.position.z += e.deltaY * 0.01;
      camera.position.z = Math.max(1, Math.min(20, camera.position.z));
      renderFractal();
    }
  });
}

function setupUI() {
  const fractalTypeSelect = document.getElementById('fractal-type');
  const iterationsSlider = document.getElementById('iterations');
  const iterationsValue = document.getElementById('iterations-value');
  const colorSchemeSelect = document.getElementById('color-scheme');
  const juliaCReal = document.getElementById('julia-c-real');
  const juliaCRealValue = document.getElementById('julia-c-real-value');
  const juliaCImag = document.getElementById('julia-c-imag');
  const juliaCImagValue = document.getElementById('julia-c-imag-value');
  const powerSlider = document.getElementById('power');
  const powerValue = document.getElementById('power-value');
  const resolutionSlider = document.getElementById('resolution');
  const resolutionValue = document.getElementById('resolution-value');
  const resetViewBtn = document.getElementById('reset-view');
  const screenshotBtn = document.getElementById('screenshot');
  const juliaControls = document.getElementById('julia-controls');
  const controls3D = document.getElementById('3d-controls');
  const controls2D = document.getElementById('2d-controls');
  const xScaleSlider = document.getElementById('x-scale');
  const xScaleValue = document.getElementById('x-scale-value');
  const yScaleSlider = document.getElementById('y-scale');
  const yScaleValue = document.getElementById('y-scale-value');

  const updateFractalBtn = document.getElementById('update-fractal');

  // Set initial visibility of controls based on default fractal type
  controls2D.style.display = is2D ? 'block' : 'none';

  fractalTypeSelect.addEventListener('change', (e) => {
    currentFractalType = e.target.value;
    is2D = !['mandelbulb', 'menger', 'julia3d'].includes(currentFractalType);

    juliaControls.style.display =
      currentFractalType === 'julia' || currentFractalType === 'julia3d' ? 'block' : 'none';
    controls3D.style.display = is2D ? 'none' : 'block';
    controls2D.style.display = is2D ? 'block' : 'none';

    params.zoom = 1;
    params.offset.set(0, 0);
    fractalPlane = null; // Reset plane when type changes

    // Switch camera based on fractal type
    camera = is2D ? camera2D : camera3D;

    // Don't auto-render, wait for update button
  });

  iterationsSlider.addEventListener('input', (e) => {
    params.iterations = parseInt(e.target.value);
    iterationsValue.textContent = params.iterations;
    // Don't auto-render, wait for update button
  });

  colorSchemeSelect.addEventListener('change', (e) => {
    params.colorScheme = e.target.value;
    // Don't auto-render, wait for update button
  });

  juliaCReal.addEventListener('input', (e) => {
    params.juliaC.x = parseFloat(e.target.value);
    juliaCRealValue.textContent = params.juliaC.x.toFixed(4);
    // Don't auto-render, wait for update button
  });

  juliaCImag.addEventListener('input', (e) => {
    params.juliaC.y = parseFloat(e.target.value);
    juliaCImagValue.textContent = params.juliaC.y.toFixed(4);
    // Don't auto-render, wait for update button
  });

  powerSlider.addEventListener('input', (e) => {
    params.power = parseFloat(e.target.value);
    powerValue.textContent = params.power;
    // Don't auto-render, wait for update button
  });

  resolutionSlider.addEventListener('input', (e) => {
    params.resolution = parseInt(e.target.value);
    resolutionValue.textContent = params.resolution;
    // Don't auto-render, wait for update button
  });

  xScaleSlider.addEventListener('input', (e) => {
    params.xScale = parseFloat(e.target.value);
    xScaleValue.textContent = params.xScale.toFixed(1);
    // Don't auto-render, wait for update button
  });

  yScaleSlider.addEventListener('input', (e) => {
    params.yScale = parseFloat(e.target.value);
    yScaleValue.textContent = params.yScale.toFixed(1);
    // Don't auto-render, wait for update button
  });

  updateFractalBtn.addEventListener('click', () => {
    // Reset plane to force recreation with new settings
    if (is2D) {
      fractalPlane = null;
    }
    // Add visual feedback
    updateFractalBtn.textContent = 'Rendering...';
    updateFractalBtn.disabled = true;

    // Use requestAnimationFrame to ensure UI updates before heavy computation
    requestAnimationFrame(() => {
      renderFractal();
      updateFractalBtn.textContent = 'Update Fractal';
      updateFractalBtn.disabled = false;
    });
  });

  resetViewBtn.addEventListener('click', () => {
    params.zoom = 1;
    params.offset.set(0, 0);
    params.xScale = 1.0;
    params.yScale = 1.0;
    xScaleSlider.value = 1.0;
    yScaleSlider.value = 1.0;
    xScaleValue.textContent = '1.0';
    yScaleValue.textContent = '1.0';
    if (is2D) {
      camera2D.position.set(0, 0, 1);
      camera = camera2D;
    } else {
      camera3D.position.set(0, 0, 5);
      camera = camera3D;
    }
    camera.lookAt(0, 0, 0);
    renderFractal();
  });

  screenshotBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `fractal-${currentFractalType}-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL();
    link.click();
  });
}

// Color schemes
function getColor(iterations, maxIterations, scheme) {
  if (iterations >= maxIterations) return new THREE.Color(0, 0, 0);

  const t = iterations / maxIterations;

  switch (scheme) {
    case 'fire':
      return new THREE.Color(t, t * 0.5, 0);
    case 'ocean':
      return new THREE.Color(0, t * 0.5, t);
    case 'rainbow': {
      const hue = (t * 360) % 360;
      return new THREE.Color().setHSL(hue / 360, 1, 0.5);
    }
    case 'monochrome':
      return new THREE.Color(t, t, t);
    default: // classic
      return new THREE.Color(t * 0.5, t, t * 1.5);
  }
}

// Shader code for 2D fractals
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader2D = `
    uniform float uTime;
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform vec2 uJuliaC;
    uniform int uFractalType;
    uniform int uColorScheme;
    uniform float uXScale;
    uniform float uYScale;
    
    varying vec2 vUv;
    
    vec3 getColorScheme(float t, int scheme) {
        if (scheme == 1) { // fire
            return vec3(t, t * 0.5, 0.0);
        } else if (scheme == 2) { // ocean
            return vec3(0.0, t * 0.5, t);
        } else if (scheme == 3) { // rainbow
            float hue = mod(t * 360.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 4) { // monochrome
            return vec3(t, t, t);
        } else { // classic
            return vec3(t * 0.5, t, t * 1.5);
        }
    }
    
    int mandelbrot(vec2 c) {
        vec2 z = vec2(0.0);
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            if (dot(z, z) > 4.0) return i;
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        }
        return int(uIterations);
    }
    
    int julia(vec2 z, vec2 c) {
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            if (dot(z, z) > 4.0) return i;
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        }
        return int(uIterations);
    }
    
    void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 c = vec2(
            (uv.x - 0.5) * scale * aspect * uXScale + uOffset.x,
            (uv.y - 0.5) * scale * uYScale + uOffset.y
        );
        
        int iterations = 0;
        
        if (uFractalType == 0) { // mandelbrot
            iterations = mandelbrot(c);
        } else if (uFractalType == 1) { // julia
            iterations = julia(c, uJuliaC);
        } else {
            // Sierpinski and Koch - simplified rendering
            iterations = mandelbrot(c);
        }
        
        float t = float(iterations) / uIterations;
        vec3 color = getColorScheme(t, uColorScheme);
        
        if (iterations >= int(uIterations)) {
            color = vec3(0.0);
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// 2D Fractal Renderers using WebGL
function render2DFractal() {
  scene.clear();

  // Always recreate the plane to ensure shader uniforms are properly updated
  // This is necessary because Three.js doesn't always update uniforms correctly
  if (fractalPlane) {
    fractalPlane.geometry.dispose();
    fractalPlane.material.dispose();
    fractalPlane = null;
  }

  // Use a plane that fills the orthographic camera view exactly
  // The camera views from -2*aspect to 2*aspect horizontally (width = 4*aspect)
  // and from -2 to 2 vertically (height = 4)
  // PlaneGeometry creates a plane from -width/2 to width/2, so we need:
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
    fragmentShader: fragmentShader2D,
    uniforms: {
      uTime: { value: 0 },
      uIterations: { value: params.iterations },
      uZoom: { value: params.zoom },
      uOffset: { value: new THREE.Vector2(params.offset.x, params.offset.y) },
      uResolution: {
        value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      },
      uJuliaC: { value: new THREE.Vector2(params.juliaC.x, params.juliaC.y) },
      uFractalType: { value: getFractalTypeIndex(currentFractalType) },
      uColorScheme: { value: getColorSchemeIndex(params.colorScheme) },
      uXScale: { value: params.xScale },
      uYScale: { value: params.yScale },
    },
  });
  fractalPlane = new THREE.Mesh(geometry, material);
  // Ensure plane is centered at origin
  fractalPlane.position.set(0, 0, 0);
  scene.add(fractalPlane);

  // Use 2D camera - ensure it's positioned correctly
  camera = camera2D;
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix(); // Ensure projection is updated

  renderer.render(scene, camera);
}

function getColorSchemeIndex(scheme) {
  const schemes = ['classic', 'fire', 'ocean', 'rainbow', 'monochrome'];
  return schemes.indexOf(scheme);
}

function getFractalTypeIndex(type) {
  const types = ['mandelbrot', 'julia', 'sierpinski', 'koch'];
  return types.indexOf(type);
}

// 3D Fractal Renderers
function render3DFractal() {
  scene.clear();

  switch (currentFractalType) {
    case 'mandelbulb':
      renderMandelbulb();
      break;
    case 'menger':
      renderMengerSponge();
      break;
    case 'julia3d':
      renderJulia3D();
      break;
  }
}

function renderMandelbulb() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const size = 2;
  const step = size / params.resolution;
  const halfSize = size / 2;

  for (let x = -halfSize; x < halfSize; x += step) {
    for (let y = -halfSize; y < halfSize; y += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        const iterations = mandelbulbIterations(x, y, z);
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
}

function mandelbulbIterations(x, y, z) {
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

function renderMengerSponge() {
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
}

function renderJulia3D() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const size = 2;
  const step = size / params.resolution;
  const halfSize = size / 2;

  for (let x = -halfSize; x < halfSize; x += step) {
    for (let y = -halfSize; y < halfSize; y += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        const iterations = julia3DIterations(x, y, z);
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
}

function julia3DIterations(x, y, z) {
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

function renderFractal() {
  if (is2D) {
    render2DFractal();
  } else {
    // Clear 2D plane when switching to 3D
    if (fractalPlane) {
      fractalPlane.geometry.dispose();
      fractalPlane.material.dispose();
      fractalPlane = null;
    }
    // Use 3D camera
    camera = camera3D;
    render3DFractal();
    renderer.render(scene, camera);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Calculate FPS
  frameCount++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;
    document.getElementById('fps').textContent = `FPS: ${fps}`;
  }

  // Rotate 3D fractals
  if (!is2D && scene.children.length > 0) {
    scene.rotation.y += 0.005;
    renderer.render(scene, camera);
  } else if (is2D && fractalPlane) {
    // Update time for 2D shaders if needed
    fractalPlane.material.uniforms.uTime.value = currentTime / 1000;
    renderer.render(scene, camera);
  }
}

// Initialize on load
window.addEventListener('load', init);
