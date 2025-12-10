import { defineConfig } from 'vite';
import { copyFileSync, readFileSync, writeFileSync, cpSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, relative } from 'path';
import { execSync } from 'child_process';

// Read app version from package.json
const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const appVersion = packageJson.version;

export default defineConfig({
  define: {
    // Inject app version as a global constant
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['synaptic'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for faster builds and smaller output
    minify: 'esbuild', // Use esbuild for faster minification
    cssMinify: true, // Minify CSS
    reportCompressedSize: false, // Skip compressed size reporting for faster builds
    chunkSizeWarningLimit: 500, // Standard limit (Synaptic.js is ~48KB, much smaller than TensorFlow.js's 1MB)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put Synaptic.js in its own chunk for lazy loading
          if (id.includes('synaptic')) {
            return 'synaptic';
          }

          // Vendor dependencies - separate large libraries
          if (id.includes('node_modules')) {
            // Regl is a large library, put it in its own chunk
            if (id.includes('regl')) {
              return 'vendor-regl';
            }
            // piexifjs for EXIF handling
            if (id.includes('piexifjs') || id.includes('piexif')) {
              return 'vendor-piexif';
            }
            // All other node_modules go into a vendor chunk
            return 'vendor';
          }

          // Core rendering modules - separate heavy rendering code
          if (id.includes('/rendering/')) {
            // Engine is the core rendering orchestrator
            if (id.includes('/rendering/engine.js')) {
              return 'core-rendering';
            }
            // Canvas renderer setup
            if (id.includes('/rendering/canvas-renderer.js')) {
              return 'core-rendering';
            }
            // WebGPU renderer
            if (id.includes('/rendering/webgpu-renderer.js')) {
              return 'core-rendering';
            }
            // Other rendering utilities can stay together
            return 'rendering-utils';
          }

          // Discovery/ML modules - separate ML code
          if (id.includes('/discovery/')) {
            return 'discovery';
          }

          // UI modules - separate UI code
          if (id.includes('/ui/')) {
            // Controls is the largest UI module
            if (id.includes('/ui/controls.js')) {
              return 'ui-controls';
            }
            // Other UI modules
            return 'ui';
          }

          // Core application state and initialization
          if (id.includes('/core/')) {
            // Core config must be with app-state to avoid initialization order issues
            if (id.includes('/core/config.js')) {
              return 'core-init';
            }
            // App state must be in same chunk as initialization to avoid circular deps
            if (id.includes('/core/app-state.js') || id.includes('/core/initialization.js')) {
              return 'core-init';
            }
            // Logger is used by app-state, keep it together
            if (id.includes('/core/logger.js')) {
              return 'core-init';
            }
            // Other core modules
            return 'core';
          }
          // Helper function to check if a fractal belongs to a family
          const isFamilyFractal = (familyName, fractalNames) => {
            if (id.includes(`/fractals/2d/families/${familyName}.js`)) {
              return familyName;
            }
            if (id.includes('/fractals/2d/')) {
              return fractalNames.some((name) => id.includes(`${name}.js`)) ? familyName : null;
            }
            return null;
          };

          // Mandelbrot Family
          const mandelbrotFamily = isFamilyFractal('mandelbrot-family', [
            'mandelbrot',
            'celtic-mandelbrot',
            'multibrot',
            'mutant-mandelbrot',
            'phoenix-mandelbrot',
            'burning-ship',
            'tricorn',
            'nebulabrot',
            'buddhabrot',
            'buffalo',
            'popcorn',
            'spider-set',
            'magnet',
          ]);
          if (mandelbrotFamily) return mandelbrotFamily;

          // Julia Family
          const juliaFamily = isFamilyFractal('julia-family', [
            'julia',
            'julia-snakes',
            'multibrot-julia',
            'burning-ship-julia',
            'tricorn-julia',
            'phoenix-julia',
            'lambda-julia',
            'hybrid-julia',
          ]);
          if (juliaFamily) return juliaFamily;

          // Sierpinski Family
          const sierpinskiFamily = isFamilyFractal('sierpinski-family', [
            'sierpinski',
            'sierpinski-arrowhead',
            'sierpinski-carpet',
            'sierpinski-gasket',
            'sierpinski-hexagon',
            'sierpinski-lsystem',
            'sierpinski-pentagon',
            'quadrilateral-subdivision',
            'recursive-polygon-splitting',
            'triangular-subdivision',
          ]);
          if (sierpinskiFamily) return sierpinskiFamily;

          // Dragon Family
          const dragonFamily = isFamilyFractal('dragon-family', [
            'binary-dragon',
            'dragon-lsystem',
            'folded-paper-dragon',
            'heighway-dragon',
            'terdragon',
            'twindragon',
          ]);
          if (dragonFamily) return dragonFamily;

          // Space-Filling Family
          const spaceFillingFamily = isFamilyFractal('space-filling-family', [
            'gosper-curve',
            'hilbert-curve',
            'levy-c-curve',
            'moore-curve',
            'peano-curve',
            'sierpinski-curve',
          ]);
          if (spaceFillingFamily) return spaceFillingFamily;

          // Root-Finding Family
          const rootFindingFamily = isFamilyFractal('root-finding-family', [
            'newton',
            'halley',
            'nova',
          ]);
          if (rootFindingFamily) return rootFindingFamily;

          // Plant Family
          const plantFamily = isFamilyFractal('plant-family', [
            'plant',
            'barnsley-fern',
            'fractal-tree',
            'pythagoras-tree',
          ]);
          if (plantFamily) return plantFamily;

          // Koch Family
          const kochFamily = isFamilyFractal('koch-family', [
            'fractal-islands',
            'koch',
            'quadratic-koch',
          ]);
          if (kochFamily) return kochFamily;

          // Cantor Family
          const cantorFamily = isFamilyFractal('cantor-family', [
            'cantor',
            'cantor-dust-base-expansion',
            'cantor-dust-circular',
            'fat-cantor',
            'smith-volterra-cantor',
            'random-cantor',
          ]);
          if (cantorFamily) return cantorFamily;

          // Tiling Family
          const tilingFamily = isFamilyFractal('tiling-family', [
            'domino-substitution',
            'pinwheel-tiling',
            'snowflake-tiling',
            'amman-tiling',
            'penrose-substitution',
            'rauzy',
            'chair-tiling',
          ]);
          if (tilingFamily) return tilingFamily;

          // Attractor Family
          const attractorFamily = isFamilyFractal('attractor-family', [
            'lorenz-attractor',
            'rossler-attractor',
            'lyapunov',
          ]);
          if (attractorFamily) return attractorFamily;

          // Noise Family
          const noiseFamily = isFamilyFractal('noise-family', [
            'perlin-noise',
            'simplex-noise',
            'fractional-brownian-motion',
            'random-midpoint-displacement',
          ]);
          if (noiseFamily) return noiseFamily;

          // Physics Family
          const physicsFamily = isFamilyFractal('physics-family', [
            'diffusion-limited-aggregation',
            'percolation-cluster',
            'levy-flights',
          ]);
          if (physicsFamily) return physicsFamily;

          // Geometric Family
          const geometricFamily = isFamilyFractal('geometric-family', [
            'apollonian-gasket',
            'carpenter-square',
            'cross',
            'box-variants',
            'minkowski-sausage',
            'cesaro',
            'recursive-circle-removal',
            'rose',
            'menger-sponge',
          ]);
          if (geometricFamily) return geometricFamily;

          // Other Family
          const otherFamily = isFamilyFractal('other-family', [
            'h-tree',
            'h-tree-generalized',
            'vicsek',
            'fractal-flame',
          ]);
          if (otherFamily) return otherFamily;
        },
      },
    },
  },
  plugins: [
    {
      name: 'exclude-cloudflare-files',
      enforce: 'pre', // Run before Vite's import analysis plugin
      load(id) {
        // Prevent Vite from trying to parse Cloudflare config files
        // Check both relative and absolute paths
        const normalizedId = id.replace(/\\/g, '/');
        if (
          normalizedId.includes('/_headers') ||
          normalizedId.includes('/_redirects') ||
          normalizedId.includes('/_routes.json') ||
          normalizedId.endsWith('_headers') ||
          normalizedId.endsWith('_redirects') ||
          normalizedId.endsWith('_routes.json')
        ) {
          // Return empty module to prevent parsing errors
          return 'export default {}';
        }
        return null;
      },
    },
    {
      name: 'inject-build-year',
      transformIndexHtml(html) {
        // Replace {{BUILD_YEAR}} placeholder with current year at build time
        const currentYear = new Date().getFullYear();

        // Use the app version already read from package.json above

        // Get short git SHA for current commit; fall back gracefully if git is unavailable
        let gitSha = 'dev';
        try {
          gitSha = execSync('git rev-parse --short HEAD').toString().trim();
        } catch {
          // Leave gitSha as 'dev' when git is not available (e.g. in some CI environments)
        }

        return html
          .replace(/\{\{BUILD_YEAR\}\}/g, currentYear.toString())
          .replace(/\{\{APP_VERSION\}\}/g, appVersion)
          .replace(/\{\{GIT_SHA\}\}/g, gitSha);
      },
    },
    {
      name: 'copy-cloudflare-files',
      closeBundle() {
        // Copy _routes.json to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_routes.json'),
          resolve(__dirname, 'dist', '_routes.json')
        );
        // Copy _headers to dist directory for Cloudflare Pages
        copyFileSync(resolve(__dirname, '_headers'), resolve(__dirname, 'dist', '_headers'));
        // Copy _redirects to dist directory for Cloudflare Pages
        copyFileSync(resolve(__dirname, '_redirects'), resolve(__dirname, 'dist', '_redirects'));
        // Collect all assets for service worker pre-caching
        const distDir = resolve(__dirname, 'dist');
        let assetManifest = [];

        // Helper to recursively collect files
        const collectAssets = (dir, baseDir = distDir) => {
          try {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = resolve(dir, entry.name);
              const relPath = '/' + relative(baseDir, fullPath).replace(/\\/g, '/');

              if (entry.isDirectory()) {
                // Skip certain directories
                if (!['node_modules', '.git'].includes(entry.name)) {
                  collectAssets(fullPath, baseDir);
                }
              } else if (entry.isFile()) {
                // Skip service worker itself and source maps
                if (!entry.name.endsWith('.map') && entry.name !== 'sw.js' && !entry.name.endsWith('.br')) {
                  assetManifest.push(relPath);
                }
              }
            }
          } catch (err) {
            // Ignore errors for missing directories
          }
        };

        // Collect all assets from dist directory
        if (existsSync(distDir)) {
          collectAssets(distDir);
          // Sort for consistent output
          assetManifest.sort();

          // Filter out any problematic paths that might cause issues
          assetManifest = assetManifest.filter((path) => {
            // Ensure paths are valid and don't contain problematic characters
            return (
              typeof path === 'string' &&
              path.startsWith('/') &&
              !path.includes('{{') &&
              !path.includes('}}') &&
              path.length < 500 // Reasonable path length limit
            );
          });
        }

        // Process and copy service worker with cache version and asset manifest
        const swPath = resolve(__dirname, 'public', 'sw.js');
        const swDest = resolve(__dirname, 'dist', 'sw.js');
        try {
          // Generate cache version based on timestamp
          const cacheVersion = `v${Date.now()}`;
          let swContent = readFileSync(swPath, 'utf-8');
          swContent = swContent.replace(/\{\{CACHE_VERSION\}\}/g, cacheVersion);

          // Inject asset manifest as JSON array
          // Replace the entire const declaration to ensure valid JavaScript
          const manifestJson = JSON.stringify(assetManifest);
          // Replace the const ASSET_MANIFEST = []; line with the actual manifest
          swContent = swContent.replace(
            /const ASSET_MANIFEST = \[\];/,
            `const ASSET_MANIFEST = ${manifestJson};`
          );

          // Validate the service worker script doesn't have syntax errors
          // Check for common issues that would cause "object is not usable" error
          if (swContent.includes('{{ASSET_MANIFEST}}') || swContent.includes('{{CACHE_VERSION}}')) {
            console.warn('[Service Worker] Warning: Placeholders not fully replaced');
          }

          writeFileSync(swDest, swContent);
          console.log(`[Service Worker] Copied with cache version: ${cacheVersion}`);
          console.log(`[Service Worker] Pre-caching ${assetManifest.length} assets for offline support`);
        } catch (err) {
          console.warn('Service worker not found, skipping copy');
        }

        // Copy static directory to dist for preset images and other static assets
        const staticSrc = resolve(__dirname, 'static');
        const staticDest = resolve(__dirname, 'dist', 'static');
        try {
          if (existsSync(staticSrc)) {
            cpSync(staticSrc, staticDest, { recursive: true });
          }
        } catch (err) {
          console.warn('Static directory not found or copy failed:', err.message);
        }

        // Note: Brotli compression is handled by the build script after this plugin runs
        // Compression only runs in production (NODE_ENV=production)
        if (process.env.NODE_ENV === 'production') {
          console.log('[Build] Assets ready for Brotli compression');
        } else {
          console.log('[Build] Assets ready (Brotli compression skipped in development)');
        }
      },
    },
  ],
  publicDir: 'public',
});
