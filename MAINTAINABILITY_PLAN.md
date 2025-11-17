# Maintainability Improvement Plan

This document outlines recommendations for improving the maintainability of the FractalAI project.

## Priority 1: Critical Refactoring

### 1.1 Split Monolithic `main.js` (3,865 lines)

**Current Problem:** All application logic is in a single file, making it difficult to:
- Find specific functionality
- Test individual components
- Understand the codebase structure
- Make changes without affecting unrelated code

**Proposed Structure:**
```
static/js/
├── main.js                    # Entry point, minimal initialization
├── core/
│   ├── app.js                 # Main application class
│   ├── state.js               # State management
│   └── config.js              # Configuration constants
├── rendering/
│   ├── renderer.js            # Core rendering logic
│   ├── cache.js               # Frame caching
│   ├── progressive.js         # Progressive rendering
│   └── pixel-ratio.js         # Pixel ratio management
├── ui/
│   ├── controls.js            # UI control setup
│   ├── panels.js              # Panel management
│   ├── coordinate-display.js  # Coordinate display
│   └── loading-bar.js         # Loading indicators
├── input/
│   ├── mouse.js               # Mouse controls
│   ├── keyboard.js            # Keyboard controls
│   └── selection.js           # Selection box
├── sharing/
│   ├── encoder.js             # State encoding
│   ├── decoder.js             # State decoding
│   └── url-handler.js         # URL parameter handling
└── fractals/
    ├── loader.js              # Fractal module loading
    └── ...
```

**Benefits:**
- Each module has a single responsibility
- Easier to locate and modify code
- Better testability
- Reduced merge conflicts

### 1.2 Add TypeScript

**Current Problem:** No type safety, leading to:
- Runtime errors from type mismatches
- Difficulty understanding function signatures
- Poor IDE autocomplete

**Migration Strategy:**
1. Add `tsconfig.json` with gradual migration settings
2. Convert utilities first (`fractals/utils.js`)
3. Convert core modules incrementally
4. Keep `.js` files until fully migrated

**Example `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true
  },
  "include": ["static/js/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 Extract Configuration

**Current Problem:** Magic numbers and constants scattered throughout code

**Proposed `config.js`:**
```javascript
export const CONFIG = {
  rendering: {
    defaultIterations: 125,
    maxIterations: 500,
    minIterations: 10,
    progressiveSteps: [10, 25, 50, 100],
    cacheSize: 10,
  },
  canvas: {
    defaultWidth: 800,
    defaultHeight: 600,
    maxPixelRatio: 4,
    basePixelRatio: window.devicePixelRatio || 1,
  },
  zoom: {
    defaultZoom: 1,
    minZoom: 0.1,
    maxZoom: 1e10,
    zoomFactor: 2.0,
    zoomInFactor: 1.1,
    zoomOutFactor: 0.9,
  },
  julia: {
    defaultC: { x: -0.7269, y: 0.1889 },
    minC: -2.0,
    maxC: 2.0,
  },
  colors: {
    defaultScheme: 'classic',
  },
  performance: {
    renderThrottleMs: 16,
    resizeThrottleMs: 100,
    progressiveDelayMs: 50,
  },
};
```

## Priority 2: Testing & Quality

### 2.1 Add Testing Infrastructure

**Setup:**
```bash
npm install --save-dev vitest @vitest/ui jsdom
```

**Test Structure:**
```
tests/
├── unit/
│   ├── utils.test.js
│   ├── state.test.js
│   ├── encoder.test.js
│   └── cache.test.js
├── integration/
│   ├── rendering.test.js
│   └── fractal-loading.test.js
└── fixtures/
    └── fractal-states.json
```

**Example Test:**
```javascript
// tests/unit/encoder.test.js
import { describe, it, expect } from 'vitest';
import { encodeFractalState, decodeFractalState } from '../../static/js/sharing/encoder.js';

describe('Fractal State Encoding', () => {
  it('should encode and decode Julia parameters', () => {
    const state = {
      fractalType: 'julia',
      juliaC: { x: -0.7269, y: 0.1889 },
      zoom: 2.5,
      iterations: 200,
    };
    
    const encoded = encodeFractalState(state);
    const decoded = decodeFractalState(encoded);
    
    expect(decoded.juliaCX).toBeCloseTo(state.juliaC.x, 5);
    expect(decoded.juliaCY).toBeCloseTo(state.juliaC.y, 5);
  });
});
```

### 2.2 Add Code Documentation

**JSDoc Standards:**
```javascript
/**
 * Encodes fractal state into a shareable URL-safe string
 * @param {Object} state - The fractal state to encode
 * @param {string} state.fractalType - Type of fractal
 * @param {Object} state.juliaC - Julia C parameter (if applicable)
 * @param {number} state.zoom - Current zoom level
 * @returns {string} Base64-encoded, URL-safe state string
 * @throws {Error} If state is invalid
 */
export function encodeFractalState(state) {
  // ...
}
```

## Priority 3: Code Quality Improvements

### 3.1 Reduce Code Duplication

**Common Patterns to Extract:**

1. **Fractal Shader Helpers** (in `fractals/utils.js`):
```javascript
// Common shader functions used across many fractals
export const SHADER_HELPERS = {
  rotate: `
    vec2 rotate(vec2 v, float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
    }
  `,
  isInsideTriangle: `
    bool isInsideTriangle(vec2 p, vec2 v0, vec2 v1, vec2 v2) {
      // ... implementation
    }
  `,
  // ... more helpers
};
```

2. **Fractal Factory Pattern:**
```javascript
// fractals/factory.js
export function createStandardFractal(fractalFunction, options = {}) {
  return {
    render: (regl, params, canvas) => {
      const fragmentShader = createFragmentShader(
        SHADER_HELPERS.common + fractalFunction
      );
      return createStandardDrawCommand(regl, params, canvas, fragmentShader, options);
    }
  };
}
```

### 3.2 Improve Error Handling

**Error Handling Strategy:**
```javascript
// core/errors.js
export class FractalError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'FractalError';
    this.code = code;
    this.details = details;
  }
}

export const ERROR_CODES = {
  FRACTAL_LOAD_FAILED: 'FRACTAL_LOAD_FAILED',
  RENDER_FAILED: 'RENDER_FAILED',
  INVALID_STATE: 'INVALID_STATE',
};

// Usage
try {
  await loadFractal(type);
} catch (error) {
  if (error instanceof FractalError) {
    showUserFriendlyError(error);
  } else {
    console.error('Unexpected error:', error);
    showGenericError();
  }
}
```

### 3.3 State Management

**Replace Global Variables with State Manager:**
```javascript
// core/state.js
class FractalState {
  constructor() {
    this._state = {
      fractalType: 'mandelbrot',
      params: { /* ... */ },
      // ...
    };
    this._listeners = new Set();
  }
  
  get(key) {
    return this._state[key];
  }
  
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this._notify(key, value, oldValue);
  }
  
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
  
  _notify(key, newValue, oldValue) {
    this._listeners.forEach(listener => {
      listener(key, newValue, oldValue);
    });
  }
}

export const state = new FractalState();
```

## Priority 4: Developer Experience

### 4.1 Add Development Tools

**Pre-commit Hooks:**
```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,ts}": ["eslint --fix", "prettier --write"],
    "*.{css,html,md}": ["prettier --write"]
  }
}
```

**VS Code Settings:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.js": "javascript"
  }
}
```

### 4.2 Improve Build Configuration

**Enhanced `vite.config.js`:**
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'fractal-utils': ['./static/js/fractals/utils.js'],
          'fractal-2d': Object.keys(glob.sync('./static/js/fractals/2d/*.js')),
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'static/js'),
      '@fractals': resolve(__dirname, 'static/js/fractals'),
      '@core': resolve(__dirname, 'static/js/core'),
    },
  },
});
```

## Priority 5: Architecture Improvements

### 5.1 Fractal Module Interface

**Standardize Fractal Interface:**
```javascript
// fractals/interface.js
/**
 * @typedef {Object} FractalModule
 * @property {Function} render - Render function
 * @property {Object} metadata - Fractal metadata
 * @property {Object} defaultParams - Default parameters
 * @property {Function} [validateParams] - Parameter validation
 */

// Example implementation
export const mandelbrot = {
  render: (regl, params, canvas) => { /* ... */ },
  metadata: {
    name: 'Mandelbrot Set',
    description: 'The classic Mandelbrot fractal',
    category: 'complex',
    author: 'FractalAI',
  },
  defaultParams: {
    iterations: 125,
    zoom: 1,
    // ...
  },
  validateParams: (params) => {
    if (params.iterations < 1 || params.iterations > 1000) {
      throw new Error('Iterations must be between 1 and 1000');
    }
  },
};
```

### 5.2 Plugin System for Fractals

**Allow External Fractal Plugins:**
```javascript
// core/fractal-registry.js
class FractalRegistry {
  constructor() {
    this._fractals = new Map();
  }
  
  register(name, module) {
    if (!this._validateModule(module)) {
      throw new Error(`Invalid fractal module: ${name}`);
    }
    this._fractals.set(name, module);
  }
  
  get(name) {
    return this._fractals.get(name);
  }
  
  list() {
    return Array.from(this._fractals.keys());
  }
  
  _validateModule(module) {
    return module && typeof module.render === 'function';
  }
}

export const fractalRegistry = new FractalRegistry();
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Extract configuration to `config.js`
- [ ] Create basic module structure
- [ ] Set up TypeScript (gradual migration)
- [ ] Add testing infrastructure

### Phase 2: Core Refactoring (Week 3-4)
- [ ] Split `main.js` into modules
- [ ] Implement state management
- [ ] Extract rendering logic
- [ ] Extract UI logic

### Phase 3: Quality Improvements (Week 5-6)
- [ ] Add comprehensive tests
- [ ] Reduce code duplication
- [ ] Improve error handling
- [ ] Add JSDoc documentation

### Phase 4: Developer Experience (Week 7-8)
- [ ] Set up pre-commit hooks
- [ ] Improve build configuration
- [ ] Add development tools
- [ ] Create architecture documentation

## Metrics to Track

- **Code Complexity:** Reduce cyclomatic complexity
- **Test Coverage:** Aim for 80%+ coverage
- **File Size:** No file > 500 lines
- **Dependencies:** Keep dependencies minimal
- **Build Time:** Monitor and optimize
- **Bundle Size:** Track and optimize

## Notes

- Refactor incrementally to avoid breaking changes
- Maintain backward compatibility during migration
- Write tests before refactoring critical paths
- Document decisions and trade-offs
- Get team/stakeholder buy-in before major changes

