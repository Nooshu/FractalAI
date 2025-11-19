import { test, expect } from '@playwright/test';
import { FRACTAL_TYPES, getFractalConfig } from './fractal-list.js';

// Base URL for the application
const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

/**
 * Visual regression tests for all fractals
 * 
 * This test suite:
 * 1. Loads each fractal type
 * 2. Waits for rendering to complete
 * 3. Captures a screenshot
 * 4. Compares against baseline images
 * 5. Generates diff images for failures
 */
FRACTAL_TYPES.forEach((fractalType) => {
  const config = getFractalConfig(fractalType);
  
  test(`Fractal: ${fractalType}`, async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas to be ready
    const canvas = page.locator('#fractal-canvas');
    await canvas.waitFor({ state: 'visible' });
    
    // Select the fractal type from dropdown
    const fractalSelect = page.locator('#fractal-type');
    await fractalSelect.selectOption(fractalType);
    
    // Check if auto-render is enabled - if not, click update button to render
    const autoRender = page.locator('#auto-render');
    const isAutoRenderChecked = await autoRender.isChecked();
    
    if (!isAutoRenderChecked) {
      // Auto-render is disabled, so we need to manually trigger rendering
      const updateBtn = page.locator('#update-fractal');
      await updateBtn.click();
    }
    
    // Wait for fractal to load (check for loading bar to disappear)
    const loadingBar = page.locator('.loading-bar');
    try {
      await loadingBar.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Loading bar might not exist or already hidden
    }
    
    // Set iterations if needed
    if (config.iterations !== 125) {
      const iterationsSlider = page.locator('#iterations');
      await iterationsSlider.fill(config.iterations.toString());
      
      // Trigger update if auto-render is disabled
      if (!isAutoRenderChecked) {
        const updateBtn = page.locator('#update-fractal');
        await updateBtn.click();
        // Wait for loading bar again after iteration change
        try {
          await loadingBar.waitFor({ state: 'hidden', timeout: 10000 });
        } catch {
          // Loading bar might not exist or already hidden
        }
      }
    }
    
    // Wait for rendering to complete
    // This is critical for WebGL/Canvas rendering
    await page.waitForTimeout(config.waitForRender);
    
    // Additional wait for any animations or progressive rendering
    await page.waitForTimeout(500);
    
    // Hide top action bar buttons and FPS meter for clean screenshots
    await page.addStyleTag({
      content: '.top-action-bar { display: none !important; } #fps { display: none !important; }'
    });
    
    // Ensure canvas is fully rendered by checking for stable image
    // We'll take multiple screenshots and compare to ensure stability
    let previousScreenshot = null;
    let stableCount = 0;
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const currentScreenshot = await canvas.screenshot();
      
      if (previousScreenshot) {
        // Compare current with previous (simple byte comparison)
        if (currentScreenshot.equals(previousScreenshot)) {
          stableCount++;
          if (stableCount >= 2) {
            // Image is stable, proceed with visual comparison
            break;
          }
        } else {
          stableCount = 0;
        }
      }
      
      previousScreenshot = currentScreenshot;
      await page.waitForTimeout(200);
    }
    
    // Take final screenshot for comparison
    // Use the canvas element specifically to avoid UI elements
    await expect(canvas).toHaveScreenshot(`${fractalType}.png`, {
      threshold: config.threshold,
      maxDiffPixels: config.threshold * 10000, // Adjust based on canvas size
      animations: 'disabled', // Disable CSS animations
    });
  });
});

/**
 * Test fractal with different parameters (optional)
 * Uncomment to test fractals with various zoom levels, iterations, etc.
 */
// test.describe('Fractal Variations', () => {
//   const testVariations = [
//     { fractal: 'mandelbrot', zoom: 1, iterations: 125 },
//     { fractal: 'mandelbrot', zoom: 10, iterations: 200 },
//     { fractal: 'julia', zoom: 1, iterations: 125, juliaC: { x: -0.7269, y: 0.1889 } },
//   ];
//   
//   testVariations.forEach((variation) => {
//     test(`${variation.fractal} - zoom:${variation.zoom} iter:${variation.iterations}`, async ({ page }) => {
//       await page.goto(BASE_URL);
//       await page.waitForLoadState('networkidle');
//       
//       const canvas = page.locator('#fractal-canvas');
//       await canvas.waitFor({ state: 'visible' });
//       
//       await page.locator('#fractal-type').selectOption(variation.fractal);
//       await page.locator('#iterations').fill(variation.iterations.toString());
//       
//       // Set zoom if needed (would need to implement zoom control)
//       
//       await page.waitForTimeout(3000);
//       
//       const screenshotName = `${variation.fractal}_z${variation.zoom}_i${variation.iterations}.png`;
//       await expect(canvas).toHaveScreenshot(screenshotName, {
//         threshold: 0.2,
//       });
//     });
//   });
// });

