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
let currentFractalModule = null; // Currently loaded fractal module
let fractalCache = new Map(); // Cache for loaded fractal modules

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

  // Load initial fractal
  loadFractal(currentFractalType).then(() => {
    renderFractal();
    animate();
  });
}

// Dynamically load a fractal module
async function loadFractal(fractalType) {
  // Check cache first
  if (fractalCache.has(fractalType)) {
    currentFractalModule = fractalCache.get(fractalType);
    is2D = currentFractalModule.is2D;
    return;
  }

  try {
    // Determine if this is a 2D or 3D fractal
    const is2DFractal = ['mandelbrot', 'julia', 'sierpinski', 'koch'].includes(fractalType);
    const subfolder = is2DFractal ? '2d' : '3d';

    // Dynamically import the fractal module from the appropriate subfolder
    // Use explicit path to ensure Vite can resolve it
    const module = await import(`./fractals/${subfolder}/${fractalType}.js`);

    // Verify the module has required exports
    if (!module.render) {
      throw new Error(`Fractal module ${fractalType} missing render function`);
    }
    if (module.is2D === undefined) {
      throw new Error(`Fractal module ${fractalType} missing is2D export`);
    }

    currentFractalModule = module;
    is2D = module.is2D;

    // Cache the module
    fractalCache.set(fractalType, module);
    console.log(`Loaded fractal module: ${fractalType} (is2D: ${is2D})`);
  } catch (error) {
    console.error(`Failed to load fractal: ${fractalType}`, error);
    // Fallback to mandelbrot if loading fails
    if (fractalType !== 'mandelbrot') {
      console.warn(`Falling back to mandelbrot`);
      return loadFractal('mandelbrot');
    } else {
      throw error; // Re-throw if mandelbrot also fails
    }
  }
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

  fractalTypeSelect.addEventListener('change', async (e) => {
    currentFractalType = e.target.value;

    // Clear the scene completely
    scene.clear();

    // Clear previous fractal plane
    if (fractalPlane) {
      fractalPlane.geometry.dispose();
      fractalPlane.material.dispose();
      fractalPlane = null;
    }

    // Clear the cache for this fractal type to force a fresh load
    fractalCache.delete(currentFractalType);

    // Load the new fractal module
    try {
      await loadFractal(currentFractalType);
      console.log(
        `Fractal type changed to: ${currentFractalType}, module loaded:`,
        !!currentFractalModule,
        'is2D:',
        is2D
      );
    } catch (error) {
      console.error('Failed to load fractal on change:', error);
      return;
    }

    juliaControls.style.display =
      currentFractalType === 'julia' || currentFractalType === 'julia3d' ? 'block' : 'none';
    controls3D.style.display = is2D ? 'none' : 'block';
    controls2D.style.display = is2D ? 'block' : 'none';

    params.zoom = 1;
    params.offset.set(0, 0);
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

  updateFractalBtn.addEventListener('click', async () => {
    // Always ensure the correct fractal module is loaded for the current type
    try {
      await loadFractal(currentFractalType);
      console.log(
        `Update button clicked for: ${currentFractalType}, module loaded:`,
        !!currentFractalModule
      );
    } catch (error) {
      console.error('Failed to load fractal on update:', error);
      return;
    }

    // Verify the loaded module matches the current fractal type
    if (!currentFractalModule || !currentFractalModule.render) {
      console.error('Fractal module not properly loaded:', currentFractalType);
      return;
    }

    // Update is2D from the module
    is2D = currentFractalModule.is2D;

    // Reset plane to force recreation with new settings
    if (is2D && fractalPlane) {
      fractalPlane.geometry.dispose();
      fractalPlane.material.dispose();
      fractalPlane = null;
    }

    // Add visual feedback
    updateFractalBtn.textContent = 'Rendering...';
    updateFractalBtn.disabled = true;

    // Use requestAnimationFrame to ensure UI updates before heavy computation
    requestAnimationFrame(() => {
      try {
        renderFractal();
      } catch (error) {
        console.error('Error rendering fractal:', error);
      } finally {
        updateFractalBtn.textContent = 'Update Fractal';
        updateFractalBtn.disabled = false;
      }
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

function renderFractal() {
  if (!currentFractalModule) {
    console.warn('No fractal module loaded');
    return;
  }

  if (!currentFractalModule.render) {
    console.error('Fractal module missing render function:', currentFractalType);
    return;
  }

  // Update is2D from the module to ensure it's correct
  is2D = currentFractalModule.is2D;

  // Clear the scene before rendering
  scene.clear();

  // Clear previous 2D plane if switching to 3D
  if (!is2D && fractalPlane) {
    fractalPlane.geometry.dispose();
    fractalPlane.material.dispose();
    fractalPlane = null;
  }

  // Set appropriate camera
  camera = is2D ? camera2D : camera3D;

  console.log(`Rendering fractal: ${currentFractalType}, is2D: ${is2D}`);

  // Call the fractal's render function
  if (is2D) {
    fractalPlane = currentFractalModule.render(scene, camera, renderer, params, fractalPlane);
  } else {
    currentFractalModule.render(scene, camera, renderer, params);
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
