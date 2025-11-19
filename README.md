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
- Multiple color schemes (Classic, Fire, Ocean, Rainbow, Monochrome)
- Zoom and pan
- Real-time parameter adjustment
- Screenshot capture
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
   - **Build command**: `npm run build`
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
5. Click "Screenshot" to save the current view

## Technology Stack

- **regl** (v2.1.0) - Functional WebGL library for efficient rendering
- **Vite** - Fast build tool and dev server
- **WebGL Shaders** - GPU-accelerated fractal computation

## Browser Compatibility

Requires a modern browser with WebGL support:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

See LICENSE file for details.
