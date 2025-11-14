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
