# FractalAI

A web-based fractal generator using regl and WebGL. This project demonstrates interactive fractal visualization with real-time rendering capabilities, machine learning-powered discovery, and extensive performance optimizations.

**Version:** 6.0.0

## Features

### Extensive Fractal Collection (100+ Fractals)

FractalAI includes a comprehensive collection of fractals organized into families:

#### Mandelbrot Family
- Mandelbrot Set, Celtic Mandelbrot, Multibrot, Mutant Mandelbrot, Phoenix Mandelbrot, Burning Ship, Tricorn, Nebulabrot, Buddhabrot

#### Julia Family
- Julia Set, Julia Snakes, Multibrot Julia, Burning Ship Julia, Tricorn Julia, Phoenix Julia, Lambda Julia, Hybrid Julia

#### Sierpinski Family
- Sierpinski Triangle, Arrowhead, Carpet, Gasket, Hexagon, Pentagon, L-System variants

#### Koch Family
- Koch Snowflake, Quadratic Koch, Fractal Islands

#### Dragon Curves
- Heighway Dragon, Twindragon, Terdragon, Binary Dragon, Folded Paper Dragon, Dragon L-System

#### Space-Filling Curves
- Hilbert Curve, Peano Curve, Sierpinski Curve, Gosper Curve, Moore Curve, Levy C-Curve

#### Cantor Family
- Cantor Set, Fat Cantor, Smith-Volterra-Cantor, Random Cantor, Cantor Dust variants

#### Tree & Plant Family
- Fractal Tree, Binary/Ternary/Quaternary Trees, Pythagoras Tree, Barnsley Fern, Plant, L-System Trees (Oak, Pine), Fractal Canopy

#### Attractors
- Lorenz Attractor, Rössler Attractor, Chua Attractor, Magnet

#### Root-Finding Fractals
- Newton Fractal, Halley Fractal, Nova Fractal

#### Tilings
- Penrose Tiling, Pinwheel Tiling, Rhombic Tiling, Domino Substitution, Snowflake Tiling, Aperiodic Tilings

#### Other Fractals
- Apollonian Gasket, H-Tree, Vicsek, Cross, Diffusion-Limited Aggregation, Fractional Brownian Motion, Fractal Flame, Levy Flights, Menger Sponge/Carpet, Perlin Noise, Simplex Noise, Weierstrass Function, Takagi Function, Blancmange Curve, and many more!

### Interactive Controls

- **Fractal Selection** - Choose from 100+ fractal types via dropdown menu
- **Adjustable Iterations** - Control detail level (10-400 iterations)
- **35+ Color Schemes** - Classic, Fire, Ocean, Rainbow variants, Monochrome, Forest, Sunset, Purple, Cyan, Gold, Ice, Neon, Cosmic, Aurora, Coral, Autumn, Midnight, Emerald, Rose Gold, Electric, Vintage, Tropical, Galaxy, Lava, Arctic, Sakura, Volcanic, Mint, Sunrise, Steel, Prism, Mystic, Amber, and more
- **Zoom and Pan** - Click and drag to pan, scroll or double-click to zoom
- **Real-time Parameter Adjustment** - Adjust Julia set constants, scales, and other parameters in real-time
- **Screenshot Capture** - Save current view as PNG with EXIF metadata
- **Video Export** - Record animations (1-30 seconds) as WebM video files (hardware-accelerated when available)
- **FPS Monitoring** - Real-time frame rate display
- **Coordinate Display** - View and copy exact fractal coordinates
- **Presets System** - Quick-load pre-configured fractal views
- **Favorites System** - Save and manage favorite fractal configurations
- **Share & URL State** - Share fractals via URL with encoded state

### Machine Learning-Powered Discovery

FractalAI includes an intelligent discovery system that uses machine learning to find interesting fractal views:

- **ML-Based Scoring** - Uses Synaptic.js neural network to score fractal configurations
- **Hybrid Algorithm** - Combines fast heuristic screening with ML refinement
- **Personalized Learning** - Trains on your favorites to learn your preferences
- **"Surprise Me" Feature** - Discover new interesting fractals automatically
- **Background Training** - Model retrains automatically as you add favorites
- **Local Storage** - ML model and favorites persist in browser storage

### Performance Optimizations

FractalAI includes extensive performance optimizations for smooth, responsive rendering:

- **Adaptive Quality** - Dynamically adjusts rendering quality to maintain 60 FPS
- **Multi-Resolution Rendering** - Low-res preview for instant feedback, then high-res upgrade
- **Occlusion Queries** - Skips rendering invisible tiles (WebGL2)
- **OffscreenCanvas** - Non-blocking rendering on background threads
- **Worker-Based Rendering** - Multi-threaded tile rendering when available
- **Progressive Rendering** - Tile-based progressive refinement
- **Frame Caching** - Intelligent caching of rendered frames
- **GPU Timer Queries** - Accurate GPU timing for performance monitoring
- **Context Loss Recovery** - Graceful handling of WebGL context loss
- **Idle Cleanup** - Automatic resource cleanup during idle periods
- **Lifecycle Management** - Session-based resource management

### Advanced Features

- **Uniform Buffer Objects (UBO)** - Efficient parameter passing for WebGL2
- **Tile-Based Rendering** - Efficient rendering of large canvases
- **Predictive Rendering** - Pre-renders likely next frames (experimental)
- **EXIF Metadata** - Embeds fractal parameters in exported images
- **State Management** - Comprehensive application state management
- **URL State Encoding** - Share fractals via encoded URLs
- **Long Task Detection** - Monitors and reports long-running tasks
- **Performance Instrumentation** - Detailed performance metrics

## Requirements

- Node.js v24.x LTS or higher
- npm v10.x or higher

If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` to automatically switch to the correct Node.js version.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. The build process includes:
- Preset manifest generation
- Vite build with optimizations
- Brotli compression for static assets

## Deployment

### Cloudflare Pages (v3)

This project is configured for deployment on Cloudflare Pages using the v3 build system.

#### Automatic Deployment via Git

1. Connect your repository to Cloudflare Pages:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your Git provider and repository

2. Configure build settings:
   - **Build command**: `npm run build` (⚠️ Do NOT use `npm install && npm run build` - Cloudflare Pages already runs `npm clean-install` automatically)
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty or use `/`)
   - **Node version**: `24` (or higher)

3. Deploy! Cloudflare Pages will automatically build and deploy on every push to your main branch.

#### Manual Deployment via Wrangler CLI

1. Install Wrangler CLI (if not already installed):

   ```bash
   npm install -g wrangler
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Deploy to Cloudflare Pages:
   ```bash
   wrangler pages deploy dist
   ```

#### Configuration Files

- `_routes.json` - Handles SPA routing (automatically copied to `dist/` during build)
- `wrangler.toml` - Cloudflare Pages configuration for local development

The `_routes.json` file ensures that all routes are handled by the client-side application, which is essential for single-page applications.

## Usage

### Basic Usage

1. **Select a fractal** from the dropdown menu
2. **Adjust iterations** to control detail level (higher = more detail, slower)
3. **Choose a color scheme** to change the visual appearance
4. **Interact with the fractal**:
   - Click and drag to pan
   - Scroll or double-click to zoom in/out
   - Adjust parameters (like Julia set constants) for different effects
5. **Export options**:
   - Click "Screenshot" to save the current view as PNG
   - Click "Export Video" to record an animation (1-30 seconds) as WebM video file

### Discovery System

1. **Add Favorites**: Click the star icon to save interesting fractals
2. **Train ML Model**: After adding 5+ favorites, the ML model automatically trains
3. **Discover**: Use the "Surprise Me" button to find new interesting fractals based on your preferences
4. **View Favorites**: Access your saved favorites from the favorites panel

### Presets

1. Open the **Presets** panel (right sidebar)
2. Browse pre-configured fractal views
3. Click any preset to load it instantly

### Sharing

1. Click the **Share** button to generate a shareable URL
2. The URL contains encoded fractal state (type, zoom, position, parameters)
3. Share the URL with others - they'll see the exact same fractal view

## Technology Stack

- **regl** (v2.1.1) - Functional WebGL library for efficient rendering
- **Vite** (v7.2.7) - Fast build tool and dev server
- **WebGL Shaders** - GPU-accelerated fractal computation
- **Synaptic.js** (v1.1.4) - Neural network library for ML-based discovery
- **piexifjs** (v1.0.6) - EXIF metadata handling for exported images
- **Vitest** (v4.0.15) - Unit testing framework
- **Playwright** (v1.57.0) - Visual regression testing

## Testing

FractalAI includes comprehensive testing infrastructure:

### Unit Tests

- **Framework**: Vitest with jsdom environment
- **Coverage**: 100% coverage thresholds (lines, functions, branches, statements)
- **Test Count**: 941+ tests across 62 test files
- **Module Import Tests**: Automatic testing of all module imports
- **Run Tests**:
  ```bash
  npm test              # Run all tests
  npm run test:unit     # Run unit tests only
  npm run test:watch    # Watch mode
  ```

### Visual Regression Tests

- **Framework**: Playwright
- **Coverage**: Visual snapshots of all 100+ fractals
- **Run Tests**:
  ```bash
  npm run test:visual           # Run visual tests
  npm run test:visual:update    # Update snapshots
  npm run test:visual:ui        # Interactive UI mode
  npm run test:visual:report    # View test report
  ```

### Code Quality

- **Linting**: ESLint (v9.39.1)
- **Formatting**: Prettier (v3.7.4)
- **Style**: Stylelint (v16.26.1)
- **Run Checks**:
  ```bash
  npm run lint          # Check linting
  npm run lint:fix      # Fix linting issues
  npm run format        # Format code
  npm run format:check # Check formatting
  npm run stylelint     # Check CSS styles
  npm run check         # Run all checks
  ```

## Feature Flags

FractalAI includes various performance optimizations and experimental features that can be enabled or disabled via feature flags. All feature flags are located in `static/js/core/config.js` under the `CONFIG.features` object.

### Enabled by Default

These features are enabled by default and will automatically activate when browser support is detected:

#### ✅ **OffscreenCanvas** (`offscreenCanvas: true`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.offscreenCanvas`
- **Implementation**: `static/js/rendering/offscreen-renderer.js`
- **Browser Requirements**: 
  - `OffscreenCanvas` API available
  - Chrome 69+, Firefox 105+, Safari 16.4+, Edge 79+
- **What it does**: Renders fractals off the main thread using `OffscreenCanvas`, then transfers results using `transferToImageBitmap()` for non-blocking, smoother rendering
- **Auto-enabled when**: Browser supports `OffscreenCanvas` API

#### ✅ **Occlusion Queries** (`occlusionQueries: true`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.occlusionQueries`
- **Implementation**: `static/js/rendering/occlusion-query.js`
- **Browser Requirements**: 
  - WebGL2 context
  - Chrome 56+, Firefox 51+, Safari 15.4+, Edge 79+
- **What it does**: Uses occlusion queries to skip rendering invisible tiles, improving performance for tile-based rendering
- **Auto-enabled when**: WebGL2 is available

#### ✅ **Adaptive Quality** (`adaptiveQuality: true`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.adaptiveQuality`
- **Implementation**: `static/js/rendering/adaptive-quality.js`
- **Browser Requirements**: Any browser with WebGL
- **What it does**: Dynamically adjusts rendering quality (iterations) based on frame time to maintain target FPS (60 FPS by default)
- **Auto-enabled when**: Always enabled (no browser requirements)

#### ✅ **Multi-Resolution Rendering** (`multiResolution: true`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.multiResolution`
- **Implementation**: `static/js/rendering/multi-resolution.js`
- **Browser Requirements**: Any browser with WebGL
- **What it does**: Renders at low resolution first for instant feedback, then upgrades to high resolution in the background
- **Auto-enabled when**: Always enabled (no browser requirements)

#### ✅ **GPU Timer Queries** (`timerQuery: true`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.timerQuery`
- **Implementation**: `static/js/rendering/gpu-timer.js`
- **Browser Requirements**: 
  - `EXT_disjoint_timer_query` extension (WebGL1) or `EXT_disjoint_timer_query_webgl2` extension (WebGL2)
  - Chrome 56+, Firefox 51+, Safari 15.4+, Edge 79+ (varies by extension support)
- **What it does**: Provides accurate GPU timing measurements for performance profiling and adaptive quality management
- **Auto-enabled when**: Timer query extension is detected (falls back to CPU timing if unavailable)

### Behind Feature Flags (Disabled by Default)

These features are implemented but disabled by default. Enable them by setting the flag to `true` in `static/js/core/config.js`:

#### 🔬 **WebGPU** (`webgpu: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.webgpu`
- **Implementation**: `static/js/rendering/webgpu-renderer.js`
- **Browser Requirements**: 
  - `navigator.gpu` available
  - Chrome 113+, Edge 113+, Firefox 110+ (experimental)
  - Requires secure context (HTTPS or localhost)
- **What it does**: Uses WebGPU compute shaders for fractal computation, providing better GPU utilization than WebGL
- **Enable when**: WebGPU is stable in your target browsers
- **Status**: Experimental, may have compatibility issues

#### 🔬 **WebGL Compute Shaders** (`computeShaders: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.computeShaders`
- **Implementation**: `static/js/rendering/webgl-compute-renderer.js`
- **Browser Requirements**: 
  - WebGL2 context
  - `WEBGL_compute_shader` extension available
  - Currently in draft stage, limited browser support
- **What it does**: Uses WebGL compute shaders for parallel pixel computation instead of fragment shaders
- **Enable when**: `WEBGL_compute_shader` extension becomes widely available
- **Status**: Experimental, extension not widely supported yet

#### 🔬 **SharedArrayBuffer** (`sharedArrayBuffer: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.sharedArrayBuffer`
- **Implementation**: `static/js/workers/shared-array-buffer-utils.js`
- **Browser Requirements**: 
  - `SharedArrayBuffer` available
  - Requires Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP) headers
  - Chrome 92+, Firefox 79+, Safari 15.2+, Edge 92+
- **What it does**: Enables zero-copy data sharing between main thread and Web Workers for multi-threaded rendering
- **Enable when**: Your deployment can provide required security headers (COOP/COEP)
- **Status**: Requires server configuration for security headers

#### 🔬 **Predictive Rendering** (`predictiveRendering: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.predictiveRendering`
- **Implementation**: `static/js/rendering/predictive-rendering.js`
- **Browser Requirements**: Any browser with WebGL
- **What it does**: Pre-renders likely next frames based on user interaction velocity to reduce perceived latency
- **Enable when**: You want to experiment with predictive rendering (may increase memory usage)
- **Status**: Experimental, may not always improve performance

#### 🔬 **WebCodecs API** (`webCodecs: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.webCodecs`
- **Implementation**: `static/js/export/video-encoder.js`
- **Browser Requirements**: 
  - **WebCodecs API**: Chrome 94+, Edge 94+, Firefox 130+ (experimental), Safari 26.0+ (experimental)
  - **MediaRecorder API** (fallback): Chrome 47+, Firefox 25+, Safari 14.1+, Edge 79+
- **What it does**: Hardware-accelerated video encoding for fractal animation export. Records fractal animations as video files (WebM format). Uses WebCodecs API when available for better performance, falls back to MediaRecorder API for broader browser support.
- **Enable when**: You want to export fractal animations as video files
- **Status**: ✅ Implemented - Uses WebCodecs when available, MediaRecorder as fallback
- **Usage**: Click the "Export Video" button in the top action bar, enter duration (1-30 seconds), and the video will be recorded and downloaded

#### 🔬 **WebAssembly SIMD** (`wasmSimd: false`)
- **Location**: `static/js/core/config.js` → `CONFIG.features.wasmSimd`
- **Implementation**: `static/js/workers/wasm-simd-utils.js`
- **Browser Requirements**: 
  - WebAssembly SIMD proposal support
  - Chrome 91+, Firefox 89+, Safari 16.4+, Edge 91+
- **What it does**: Uses SIMD instructions in WebAssembly for faster CPU-based fractal computation fallback
- **Enable when**: You need CPU fallback rendering and browser supports SIMD
- **Status**: Structure implemented, requires WASM module compilation

### Worker Configuration

Worker-based optimizations are controlled separately in `CONFIG.workers`:

- **`workers.enabled`**: `true` (auto-detected based on hardware)
- **`workers.minCores`**: `2` (minimum CPU cores required)
- **`workers.maxWorkers`**: `4` (maximum worker threads)
- **`workers.requireSharedArrayBuffer`**: `false` (optional, requires COOP/COEP headers)

Workers are automatically enabled when:
- Browser supports Web Workers
- System has at least 2 CPU cores (configurable via `minCores`)
- Feature detection passes (see `static/js/workers/feature-detection.js`)

### How to Enable/Disable Features

To modify feature flags, edit `static/js/core/config.js`:

```javascript
export const CONFIG = {
  features: {
    // Enable an experimental feature
    webgpu: true,  // Change from false to true
    
    // Disable a default feature
    multiResolution: false,  // Change from true to false
  },
};
```

After changing feature flags, restart the development server or rebuild for production.

### Feature Detection

The application automatically detects browser capabilities and enables features when available. You can check which features are active by:

1. Opening the browser console (F12)
2. Looking for feature initialization messages (in development mode)
3. Checking the console for capability detection logs

## Project Structure

```
FractalAI/
├── index.html                    # Main HTML file
├── static/
│   ├── css/
│   │   └── styles.css            # All application styles
│   ├── js/
│   │   ├── main.js               # Main application entry point
│   │   ├── core/                 # Core application logic
│   │   │   ├── app-state.js      # Application state management
│   │   │   ├── config.js         # Configuration and feature flags
│   │   │   ├── initialization.js # App initialization
│   │   │   ├── logger.js         # Development logging
│   │   │   ├── lifecycle-manager.js # Session lifecycle management
│   │   │   └── idle-cleanup.js   # Idle resource cleanup
│   │   ├── fractals/             # Fractal implementations
│   │   │   ├── 2d/               # 2D fractal implementations (100+ files)
│   │   │   │   └── families/     # Fractal family groupings
│   │   │   ├── loader.js         # Fractal loading system
│   │   │   ├── utils.js          # Shared fractal utilities
│   │   │   ├── fractal-config.js # Fractal configuration
│   │   │   └── fractal-info.js   # Fractal metadata
│   │   ├── rendering/            # Rendering engine and optimizations
│   │   │   ├── engine.js         # Main rendering engine
│   │   │   ├── canvas-renderer.js # Canvas setup
│   │   │   ├── adaptive-quality.js # Adaptive quality management
│   │   │   ├── multi-resolution.js # Multi-resolution rendering
│   │   │   ├── occlusion-query.js # Occlusion query optimization
│   │   │   ├── predictive-rendering.js # Predictive rendering
│   │   │   ├── tile-renderer.js   # Tile-based rendering
│   │   │   ├── gpu-timer.js       # GPU timing
│   │   │   ├── context-loss-handler.js # Context loss recovery
│   │   │   └── uniform-buffer.js # WebGL2 UBO support
│   │   ├── discovery/            # ML-based discovery system
│   │   │   ├── discovery-manager.js # Discovery system manager
│   │   │   ├── discovery-algorithm.js # Discovery algorithms
│   │   │   ├── ml-trainer.js     # ML model training
│   │   │   └── favorites-manager.js # Favorites management
│   │   ├── workers/              # Web Worker implementations
│   │   │   ├── pool.js           # Worker pool management
│   │   │   ├── feature-detection.js # Worker capability detection
│   │   │   └── tile-protocol.js  # Tile rendering protocol
│   │   ├── ui/                   # UI components
│   │   │   ├── controls.js       # UI controls
│   │   │   ├── panels.js         # Panel management
│   │   │   ├── presets.js        # Presets UI
│   │   │   ├── discovery-ui.js   # Discovery UI
│   │   │   └── exif-editor.js    # EXIF metadata editor
│   │   ├── sharing/               # Sharing and state management
│   │   │   ├── state-manager.js  # URL state management
│   │   │   ├── encoder.js        # State encoding
│   │   │   └── decoder.js        # State decoding
│   │   ├── export/                # Export functionality
│   │   │   └── video-encoder.js  # Video export
│   │   └── performance/          # Performance monitoring
│   │       ├── fps-tracker.js    # FPS tracking
│   │       ├── instrumentation.js # Performance instrumentation
│   │       └── long-task-detector.js # Long task detection
│   └── presets/                   # Fractal presets
│       ├── presets.json          # Preset configurations
│       └── images/                # Preset preview images
├── tests/
│   ├── unit/                      # Unit tests (62 test files, 941+ tests)
│   └── visual/                    # Visual regression tests
├── scripts/                        # Build scripts
│   ├── generate-presets-manifest.js
│   └── compress-brotli.js
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
├── vitest.config.js               # Vitest configuration
└── playwright.config.js           # Playwright configuration
```

## Browser Compatibility

Requires a modern browser with WebGL support:

- **Chrome/Edge** (latest) - Full feature support
- **Firefox** (latest) - Full feature support
- **Safari** (latest) - Full feature support (some experimental features may be limited)

### Minimum Requirements

- WebGL 1.0 or WebGL 2.0 support
- ES6+ JavaScript support
- Canvas API support

### Recommended

- WebGL2 for best performance and features
- Multi-core CPU for worker-based optimizations
- Modern GPU for hardware acceleration

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Code of conduct
- Development setup
- Coding standards
- Adding new fractals
- Testing requirements
- Submitting changes

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

See LICENSE file for full legal text.

## Acknowledgments

- Built with [regl](https://github.com/regl-project/regl) for WebGL rendering
- ML-powered discovery uses [Synaptic.js](https://github.com/cazala/synaptic)
- Tested with [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)
