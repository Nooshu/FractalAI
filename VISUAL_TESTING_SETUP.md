# Visual Regression Testing Setup Guide

This guide explains how to set up and use visual regression testing for all fractals in the FractalAI project.

## Why Playwright?

I recommend **Playwright** for this project because:

1. **Built-in Visual Comparison**: Excellent built-in screenshot comparison with diff generation
2. **Canvas Support**: Handles WebGL/Canvas rendering well
3. **Modern & Maintained**: Actively developed by Microsoft
4. **CI/CD Ready**: Designed for automation and continuous integration
5. **Multi-browser**: Can test across Chromium, Firefox, and WebKit
6. **Rich Reporting**: Beautiful HTML reports with side-by-side comparisons
7. **Stability Features**: Built-in waiting mechanisms and flakiness handling

## Alternative Options

If Playwright doesn't meet your needs, consider:

- **BackstopJS**: Specialized for visual regression, simpler setup
- **Jest + jest-image-snapshot**: Lightweight, integrates with Jest
- **Percy/Chromatic**: Commercial, cloud-based, great for teams

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Generate Baseline Images (First Time)

```bash
npm run test:visual:update
```

This will:
- Start the dev server automatically
- Load each fractal
- Capture baseline screenshots
- Save them to `tests/visual/fractal-visual.test.js-snapshots/`

### 3. Run Tests

```bash
npm run test:visual
```

This will:
- Compare current renders against baselines
- Generate diff images for any differences
- Create an HTML report

### 4. View Results

```bash
npm run test:visual:report
```

Opens an interactive HTML report showing:
- ✅ Passed tests
- ❌ Failed tests with diff images
- 📊 Test statistics
- ⏱️ Execution times

## Automated Analysis

The setup includes a diff analyzer that provides insights into test failures:

```bash
node tests/visual/diff-analyzer.js test-results/results.json
```

This will show:
- Total tests run
- Pass/fail statistics
- Failures grouped by fractal
- Detailed error messages
- Screenshot locations

## How It Works

### Test Flow

1. **Navigate**: Opens the app in a headless browser
2. **Select Fractal**: Chooses the fractal type from dropdown
3. **Wait for Render**: Waits for WebGL canvas to fully render
4. **Stability Check**: Ensures canvas is stable (no animations)
5. **Screenshot**: Captures the canvas element
6. **Compare**: Compares against baseline image
7. **Report**: Generates diff if differences found

### Handling Random/Variable Fractals

Some fractals have random elements (e.g., `random-cantor`, `diffusion-limited-aggregation`). These are configured with:

- **Higher threshold**: More tolerance for pixel differences
- **Longer wait times**: More time for rendering
- **Stability checks**: Multiple screenshots to ensure consistency

You can adjust these in `tests/visual/fractal-list.js`:

```javascript
fractals: {
  'random-cantor': { threshold: 0.3 }, // 30% pixel difference allowed
  'diffusion-limited-aggregation': { threshold: 0.3 },
}
```

## Configuration

### Per-Fractal Settings

Edit `tests/visual/fractal-list.js` to customize:

```javascript
fractals: {
  'mandelbrot': {
    iterations: 200,        // Higher detail
    waitForRender: 3000,    // More time to render
    threshold: 0.2,         // 20% pixel difference allowed
  },
}
```

### Global Settings

Edit `playwright.config.js` to adjust:

- **Viewport size**: Canvas dimensions
- **Timeout**: Maximum test duration
- **Threshold**: Default pixel comparison threshold
- **Browsers**: Which browsers to test on

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:visual
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### Updating Baselines in CI

When you intentionally change a fractal's appearance:

1. Run tests locally: `npm run test:visual:update`
2. Commit the updated baseline images
3. Push to trigger CI

## Troubleshooting

### Tests Fail Intermittently

**Problem**: Tests sometimes pass, sometimes fail

**Solutions**:
1. Increase `waitForRender` in fractal config
2. Increase `threshold` for variable fractals
3. Check for animations that aren't disabled
4. Ensure consistent viewport size

### Canvas Not Rendering

**Problem**: Screenshots are black or empty

**Solutions**:
1. Check WebGL support: `npx playwright test --headed`
2. Increase timeout in test
3. Check browser console for errors
4. Verify fractal module loads correctly

### Screenshots Don't Match

**Problem**: Baselines don't match even when correct

**Solutions**:
1. Check viewport size is consistent
2. Verify browser version matches
3. Check for system fonts/antialiasing differences
4. Consider using Docker for consistent environment

### Random Fractals Always Fail

**Problem**: Random fractals fail even with high threshold

**Solutions**:
1. Increase threshold further (0.4-0.5)
2. Use deterministic seed if fractal supports it
3. Test multiple renders and use median result
4. Consider excluding from visual tests, use unit tests instead

## Best Practices

1. **Update Baselines Intentionally**: Only update when you mean to change visuals
2. **Review Diffs Carefully**: Small differences might indicate real issues
3. **Test on Multiple Browsers**: Different browsers render differently
4. **Keep Tests Fast**: Use appropriate wait times, not excessive
5. **Document Special Cases**: Note any fractals needing special handling
6. **Version Control Baselines**: Commit baseline images to git
7. **Regular Maintenance**: Review and update baselines periodically

## Advanced Usage

### Testing Specific Fractals

```bash
# Test only Mandelbrot
npx playwright test -g "mandelbrot"

# Test all Julia sets
npx playwright test -g "julia"
```

### Testing with Different Parameters

Modify the test file to test fractals with different:
- Zoom levels
- Iteration counts
- Color schemes
- Julia C values

### Custom Comparison Logic

For advanced comparison needs, you can:

1. Use Playwright's image comparison API directly
2. Implement custom diff algorithms
3. Use perceptual diff tools (like `pixelmatch`)
4. Compare specific regions of the canvas

## Performance

- **Parallel Execution**: Tests run in parallel (limited to avoid overwhelming server)
- **Caching**: Baseline images are cached
- **Selective Testing**: Can test only changed fractals
- **CI Optimization**: Fewer workers in CI to reduce load

## Next Steps

1. Run initial baseline generation
2. Review baseline images for correctness
3. Integrate into CI/CD pipeline
4. Set up automated alerts for failures
5. Consider cross-browser testing
6. Add performance benchmarks alongside visual tests

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Testing Guide](https://playwright.dev/docs/test-screenshots)
- [CI/CD Integration](https://playwright.dev/docs/ci)

