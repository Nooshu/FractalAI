# FractalAI

A web-based fractal generator with 2D and 3D support using Three.js and WebGL. This project demonstrates interactive fractal visualization with real-time rendering capabilities.

## Features

### 2D Fractals

- **Mandelbrot Set** - The classic fractal with infinite detail
- **Julia Set** - Interactive Julia sets with adjustable parameters
- **Sierpinski Triangle** - Geometric fractal pattern
- **Koch Snowflake** - Self-similar fractal curve

### 3D Fractals

- **Mandelbulb** - 3D extension of the Mandelbrot set
- **Menger Sponge** - 3D fractal cube
- **Julia 3D** - 3D Julia sets

### Interactive Controls

- Adjustable iteration count
- Multiple color schemes (Classic, Fire, Ocean, Rainbow, Monochrome)
- Zoom and pan for 2D fractals
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
4. For 2D fractals:
   - Click and drag to pan
   - Scroll to zoom in/out
5. For 3D fractals:
   - The fractal will auto-rotate
   - Scroll to zoom in/out
   - Adjust power and resolution for different effects
6. Click "Screenshot" to save the current view

## Technology Stack

- **Three.js** (v0.169.0) - 3D graphics and WebGL rendering
- **Vite** - Fast build tool and dev server
- **WebGL Shaders** - GPU-accelerated fractal computation

## Browser Compatibility

Requires a modern browser with WebGL support:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

See LICENSE file for details.
