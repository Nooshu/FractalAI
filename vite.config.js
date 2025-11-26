import { defineConfig } from 'vite';
import { copyFileSync, readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for faster builds and smaller output
    minify: 'esbuild', // Use esbuild for faster minification
    cssMinify: true, // Minify CSS
    reportCompressedSize: false, // Skip compressed size reporting for faster builds
  },
  plugins: [
    {
      name: 'exclude-cloudflare-files',
      enforce: 'pre', // Run before Vite's import analysis plugin
      load(id) {
        // Prevent Vite from trying to parse Cloudflare config files
        // Check both relative and absolute paths
        const normalizedId = id.replace(/\\/g, '/');
        if (normalizedId.includes('/_headers') || 
            normalizedId.includes('/_redirects') || 
            normalizedId.includes('/_routes.json') ||
            normalizedId.endsWith('_headers') ||
            normalizedId.endsWith('_redirects') ||
            normalizedId.endsWith('_routes.json')) {
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

        // Read app version from package.json (semver)
        const packageJsonPath = resolve(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const appVersion = packageJson.version;

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
        copyFileSync(
          resolve(__dirname, '_headers'),
          resolve(__dirname, 'dist', '_headers')
        );
        // Copy _redirects to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_redirects'),
          resolve(__dirname, 'dist', '_redirects')
        );
        // Process and copy service worker with cache version
        const swPath = resolve(__dirname, 'public', 'sw.js');
        const swDest = resolve(__dirname, 'dist', 'sw.js');
        try {
          // Generate cache version based on timestamp
          const cacheVersion = `v${Date.now()}`;
          let swContent = readFileSync(swPath, 'utf-8');
          swContent = swContent.replace(/\{\{CACHE_VERSION\}\}/g, cacheVersion);
          writeFileSync(swDest, swContent);
          console.log(`[Service Worker] Copied with cache version: ${cacheVersion}`);
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
      },
    },
  ],
  publicDir: 'public',
});
