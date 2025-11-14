# Contributing to FractalAI

Thank you for your interest in contributing to FractalAI! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Adding New Fractals](#adding-new-fractals)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/FractalAI.git
   cd FractalAI
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```

## Development Setup

### Prerequisites

- Node.js v24.x LTS or higher (see `.nvmrc` for exact version)
- npm v10.x or higher
- A modern web browser with WebGL support

If you use [nvm](https://github.com/nvm-sh/nvm), simply run:

```bash
nvm use
```

### Editor Configuration

This project includes an `.editorconfig` file to maintain consistent coding styles across different editors and IDEs. Most modern editors support EditorConfig either natively or via plugins:

- **VS Code**: Install the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- **IntelliJ/WebStorm**: Built-in support
- **Sublime Text**: Install the [EditorConfig package](https://github.com/sindresorhus/editorconfig-sublime)
- **Vim**: Install the [editorconfig-vim plugin](https://github.com/editorconfig/editorconfig-vim)

### Tech Stack

- **Frontend Framework**: Vanilla JavaScript (ES6 modules)
- **Graphics**: WebGL via regl library
- **Build Tool**: Vite
- **Styling**: CSS3 with CSS custom properties

## Project Structure

```
FractalAI/
├── index.html              # Main HTML file
├── static/
│   ├── css/
│   │   └── styles.css      # All application styles
│   ├── js/
│   │   ├── main.js         # Main application logic
│   │   └── fractals/
│   │       ├── utils.js    # Shared fractal utilities
│   │       └── 2d/         # 2D fractal implementations
│   │           ├── mandelbrot.js
│   │           ├── julia.js
│   │           ├── sierpinski.js
│   │           └── koch.js
│   └── images/             # Favicon and image assets
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite configuration
```

## How to Contribute

### Types of Contributions

We welcome contributions in the following areas:

- 🐛 **Bug fixes**
- ✨ **New fractal types**
- 🎨 **UI/UX improvements**
- 📝 **Documentation**
- 🚀 **Performance optimizations**
- 🎨 **New color schemes**
- ♿ **Accessibility improvements**

### Using AI Tools

**AI assistance is actively encouraged!** This project itself was built with AI collaboration, and we welcome contributions that leverage AI tools (like GitHub Copilot, Claude, ChatGPT, etc.) for code generation, debugging, optimization, and documentation. Feel free to use whatever tools help you contribute effectively.

### Reporting Bugs

When reporting bugs, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs. actual behavior
4. Browser and OS information
5. Screenshots or screen recordings (if applicable)
6. Console errors (if any)

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check if the feature has already been suggested
2. Provide a clear use case
3. Explain the expected behavior
4. Include mockups or examples if possible

## Coding Standards

### JavaScript

- Use **ES6+ syntax** (arrow functions, destructuring, etc.)
- Use **const** by default, **let** when reassignment is needed
- Use **async/await** for asynchronous operations
- Follow **camelCase** for variables and functions
- Add **JSDoc comments** for complex functions
- Keep functions **small and focused**

Example:

```javascript
/**
 * Generates vertices for a fractal
 * @param {number} iterations - Number of iterations
 * @returns {Array<[number, number]>} Array of [x, y] coordinates
 */
function generateVertices(iterations) {
  // Implementation
}
```

### CSS

- Use **CSS custom properties** (variables) for repeated values
- Follow **BEM-like naming** for classes when appropriate
- Use **kebab-case** for class names
- Group related styles together
- Add comments for complex styles

Example:

```css
:root {
  --primary-color: #4a9eff;
  --transition-normal: 0.3s ease;
}

.section-header {
  transition: all var(--transition-normal);
}
```

### GLSL (Shaders)

- Use **consistent indentation** (2 spaces)
- Add **comments** explaining complex calculations
- Use **meaningful variable names**
- Optimize for **WebGL1 compatibility** when possible

## Adding New Fractals

To add a new fractal type:

1. **Create a new file** in `static/js/fractals/2d/` (e.g., `myFractal.js`)

2. **Implement the required exports**:

   ```javascript
   export function render(regl, params, canvas) {
     // Return a regl draw command
   }

   export const is2D = true;
   ```

3. **Add to the dropdown** in `index.html`:

   ```html
   <option value="myFractal">My Fractal</option>
   ```

4. **Test thoroughly** with different parameters and color schemes

### Fractal Implementation Guidelines

- Use **fragment shaders** for mathematical fractals (Mandelbrot, Julia)
- Use **geometry generation** for iterative fractals (Koch, Sierpinski)
- Support all **color schemes** defined in `utils.js`
- Handle **zoom and pan** correctly
- Support **X/Y scaling** parameters
- Ensure good **performance** (aim for 60fps at default settings)

## Testing

### Manual Testing Checklist

Before submitting, test your changes with:

- [ ] All fractal types load correctly
- [ ] Color schemes work properly
- [ ] Zoom in/out works smoothly
- [ ] Pan (drag) works in all directions
- [ ] Auto-render toggle works
- [ ] Fullscreen mode works
- [ ] Side panel hide/show works
- [ ] Screenshots can be captured
- [ ] Reset view works
- [ ] Works on Chrome, Firefox, and Safari
- [ ] Works on desktop and mobile
- [ ] No console errors

### Performance Testing

- Check FPS meter stays above 30fps
- Test with high iteration counts (200)
- Test deep zoom levels
- Monitor memory usage

## Submitting Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-dragon-curve`
- `fix/julia-set-rendering`
- `docs/update-readme`
- `perf/optimize-shader`

### Commit Messages

Write clear, descriptive commit messages:

```
Add Dragon Curve fractal implementation

- Implement fragment shader for Dragon Curve
- Add geometry generation for iterations
- Support all color schemes
- Add to fractal selector dropdown
```

### Pull Request Process

1. **Update your branch** with the latest main:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Test thoroughly** using the checklist above

3. **Create a Pull Request** with:
   - Clear title describing the change
   - Detailed description of what changed and why
   - Screenshots/recordings for visual changes
   - References to related issues

4. **Respond to feedback** promptly and make requested changes

5. **Keep commits clean** - squash if needed before final merge

## Style Guide Summary

### Files and Folders

- Use lowercase with hyphens: `my-fractal.js`
- Place fractals in appropriate subdirectories

### Code Organization

- Group imports at the top
- Declare constants before functions
- Export required functions/constants
- Clean up resources when needed

### Comments

- Explain **why**, not **what**
- Add JSDoc for public functions
- Document complex algorithms
- Include references for mathematical formulas

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Create a new issue with the `question` label
3. Contact [Matt Hobbs](https://nooshu.com)

## License

By contributing to FractalAI, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to FractalAI! Your efforts help make this project better for everyone. 🎨✨
