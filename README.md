# FractalAI

A web-based fractal generator using regl and WebGL. This project demonstrates interactive fractal visualization with real-time rendering capabilities.

## Features

### Fractals

- **Mandelbrot Set** - The classic fractal with infinite detail
- **Julia Set** - Interactive Julia sets with adjustable parameters
- **Sierpinski Triangle** - Geometric fractal pattern
- **Koch Snowflake** - Self-similar fractal curve

### Interactive Controls

- Adjustable iteration count
- Multiple color schemes (Classic, Fire, Ocean, Rainbow, Monochrome, and many more)
- Zoom and pan
- Real-time parameter adjustment
- Screenshot capture (PNG)
- Video export (WebM format, hardware-accelerated when available)
- FPS monitoring

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

The built files will be in the `dist/` directory.

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

1. Select a fractal type from the dropdown menu
2. Adjust iterations to control detail level (higher = more detail, slower)
3. Choose a color scheme to change the visual appearance
4. Interaction:
   - Click and drag to pan
   - Scroll or double-click to zoom in/out
   - Adjust parameters (like Julia set constants) for different effects
5. Export options:
   - Click "Screenshot" to save the current view as PNG
   - Click "Export Video" to record an animation (1-30 seconds) as WebM video file

## Technology Stack

- **regl** (v2.1.0) - Functional WebGL library for efficient rendering
- **Vite** - Fast build tool and dev server
- **WebGL Shaders** - GPU-accelerated fractal computation

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

## Browser Compatibility

Requires a modern browser with WebGL support:

- Chrome/Edge (latest) - Full feature support
- Firefox (latest) - Full feature support
- Safari (latest) - Full feature support (some experimental features may be limited)

### Minimum Requirements

- WebGL 1.0 or WebGL 2.0 support
- ES6+ JavaScript support
- Canvas API support

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

See LICENSE file for full legal text.
