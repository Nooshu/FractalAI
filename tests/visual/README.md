# Visual Regression Testing

This directory contains visual regression tests for all fractals using [Playwright](https://playwright.dev/).

## Overview

Visual regression testing captures screenshots of each fractal and compares them against baseline images to detect visual changes. This ensures that:

- Fractals render correctly after code changes
- No visual regressions are introduced
- All fractals are tested automatically
- Differences are clearly highlighted with diff images

## Setup

1. **Install Playwright:**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

2. **Update baselines (first run):**

```bash
npm run test:visual:update
```

3. **Run tests:**

```bash
npm run test:visual
```

## Test Structure

- `fractal-list.js` - List of all fractals and their configurations
- `fractal-visual.test.js` - Main test file that tests all fractals
- `playwright.config.js` - Playwright configuration

## Baseline Images

Baseline images are stored in `tests/visual/fractal-visual.test.js-snapshots/`. These are the "golden" images that new screenshots are compared against.

## Updating Baselines

When you intentionally change a fractal's appearance, update the baselines:

```bash
npm run test:visual:update
```

Or update a specific fractal:

```bash
npx playwright test --update-snapshots -g "mandelbrot"
```

## Test Configuration

Each fractal can have custom configuration in `fractal-list.js`:

- `iterations` - Number of iterations for rendering
- `waitForRender` - Time to wait for rendering (ms)
- `threshold` - Pixel difference threshold (0-1)
  - Lower = stricter comparison
  - Higher = more tolerant (useful for random/variable fractals)

## Handling Random/Variable Fractals

Some fractals have random elements (e.g., `random-cantor`, `diffusion-limited-aggregation`). These have higher thresholds to account for natural variation. If a fractal is too variable, consider:

1. Increasing the threshold
2. Using a deterministic seed (if the fractal supports it)
3. Testing multiple renders and using the most common result

## CI/CD Integration

The tests are designed to run in CI/CD pipelines. Set the `CI` environment variable:

```yaml
# Example GitHub Actions
- name: Run visual tests
  run: npm run test:visual
  env:
    CI: true
```

## Viewing Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

This opens an interactive report showing:

- Passed/failed tests
- Screenshot comparisons
- Diff images highlighting differences
- Test execution times

## Troubleshooting

### Tests are flaky (sometimes pass, sometimes fail)

1. **Increase wait time:** Some fractals need more time to render
2. **Increase threshold:** For fractals with slight variations
3. **Check for animations:** Ensure animations are disabled
4. **Stabilize canvas:** The test waits for stable canvas rendering

### Screenshots don't match

1. **Check viewport size:** Ensure consistent viewport across runs
2. **Check browser:** Different browsers may render slightly differently
3. **Check WebGL:** Ensure WebGL is available and consistent
4. **Check timing:** Some fractals need more time to fully render

### Canvas not rendering

1. **Check WebGL support:** Ensure the test environment supports WebGL
2. **Check console errors:** Look for JavaScript errors
3. **Increase timeout:** Some fractals take longer to load
4. **Check network:** Ensure all resources are loaded

## Best Practices

1. **Update baselines intentionally:** Only update when you mean to change the visual
2. **Review diffs carefully:** Small differences might indicate real issues
3. **Test on multiple browsers:** Different browsers may render differently
4. **Keep tests fast:** Use appropriate wait times, not excessive ones
5. **Document special cases:** Note any fractals that need special handling

## Advanced Usage

### Testing Specific Fractals

```bash
# Test only Mandelbrot
npx playwright test -g "mandelbrot"

# Test all Julia sets
npx playwright test -g "julia"
```

### Testing with Different Parameters

Modify `fractal-visual.test.js` to test fractals with different zoom levels, iterations, or other parameters. See the commented example in the test file.

### Custom Screenshot Comparison

For more advanced comparison, you can use Playwright's image comparison API directly:

```javascript
const screenshot = await canvas.screenshot();
const baseline = await fs.readFile('baseline.png');
const diff = await compareImages(screenshot, baseline);
```
