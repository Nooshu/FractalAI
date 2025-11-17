# WebGL Optimization Opportunities for Fractal Rendering

## Current Optimizations Already Implemented ✅

1. **Frame Caching** - Cached frames are reused when parameters match
2. **Progressive Rendering** - Lower iterations during interaction, full quality when idle
3. **Palette Texture Caching** - Color palettes are cached to avoid regeneration
4. **Shader Compilation Caching** - Shaders are cached (though not fully utilized)
5. **Pixel Ratio Adjustment** - Dynamic pixel ratio based on zoom level
6. **Render Throttling** - Batched render requests via `scheduleRender()`
7. **Early Bailout** - Some fractals use early exit conditions
8. **Shader Optimizations** - Precomputed constants, optimized math operations

## Recommended Optimizations

### 1. **Draw Command Reuse with Dynamic Uniforms** (High Impact)

**Current Issue**: Each render creates a new draw command, causing shader recompilation overhead.

**Solution**: Use regl's `regl.prop()` to create reusable draw commands that accept uniforms dynamically.

```javascript
// Instead of creating new draw command each time:
const drawFractal = regl({
  uniforms: {
    uZoom: params.zoom,  // Static value
    // ...
  }
});

// Use dynamic uniforms:
const drawFractal = regl({
  uniforms: {
    uZoom: regl.prop('uZoom'),  // Dynamic value
    // ...
  }
});

// Then call with:
drawFractal({ uZoom: params.zoom, /* other uniforms */ });
```

**Benefits**: 
- Eliminates shader recompilation overhead
- Faster uniform updates
- Better performance during interaction

### 2. **Reduce Framebuffer Operations** (Medium Impact)

**Current Issue**: Frame caching creates a new framebuffer on every render.

**Solution**: 
- Reuse framebuffers when canvas size hasn't changed
- Only create new framebuffer when dimensions change
- Pool framebuffers for common sizes

**Implementation**:
```javascript
const framebufferPool = new Map();

function getFramebuffer(width, height) {
  const key = `${width}x${height}`;
  if (framebufferPool.has(key)) {
    return framebufferPool.get(key);
  }
  const fb = regl.framebuffer({ width, height, /* ... */ });
  framebufferPool.set(key, fb);
  return fb;
}
```

### 3. **WebGL2 Uniform Buffer Objects (UBOs)** (High Impact - WebGL2 only)

**Current Issue**: Uniforms are sent individually, causing multiple state changes.

**Solution**: Use Uniform Buffer Objects to batch uniform updates.

**Benefits**:
- Single state change for all uniforms
- Better GPU cache utilization
- Significant performance improvement on WebGL2 devices

### 4. **Adaptive Quality During Interaction** (High Impact)

**Current Issue**: Full quality rendering during pan/zoom causes lag.

**Solution**: 
- Lower resolution during interaction (e.g., 0.5x or 0.75x)
- Reduce iterations during interaction
- Full quality when idle

**Implementation**:
```javascript
let isInteracting = false;
let interactionTimeout = null;

function startInteraction() {
  isInteracting = true;
  clearTimeout(interactionTimeout);
  // Render at lower quality
  renderAtQuality(0.5);
}

function endInteraction() {
  interactionTimeout = setTimeout(() => {
    isInteracting = false;
    // Render at full quality
    renderAtQuality(1.0);
  }, 300);
}
```

### 5. **Optimize Shader Precision** (Medium Impact)

**Current Issue**: All calculations use `mediump float`.

**Solution**: Use `lowp` for color calculations where precision isn't critical.

```glsl
precision mediump float;  // For calculations
precision lowp float;      // For color values (if acceptable)
```

**Note**: Test carefully as `lowp` can cause banding in some color schemes.

### 6. **Reduce Texture Lookups** (Low-Medium Impact)

**Current Issue**: Single texture lookup per pixel (already optimal).

**Potential**: If using multiple textures, consider texture atlases or combined textures.

### 7. **Batch State Changes** (Medium Impact)

**Current Issue**: Multiple WebGL state changes per frame.

**Solution**: Use regl's context system to batch operations:

```javascript
regl({
  // Set all state once
  blend: { enable: false },
  depth: { enable: false },
  // ...
})(() => {
  // All draws in this context share state
  drawFractal1();
  drawFractal2();
});
```

### 8. **Optimize Loop Unrolling** (Low-Medium Impact)

**Current Issue**: Some fractals could benefit from more loop unrolling.

**Solution**: Unroll more iterations in critical paths (like Julia set already does).

**Trade-off**: Larger shader code vs. better performance.

### 9. **Use Instanced Rendering for Multi-Fractal Views** (Future)

**Potential**: If rendering multiple fractals, use instanced rendering.

### 10. **WebGL State Caching** (Low Impact)

**Current Issue**: regl already handles this well, but could be optimized further.

**Solution**: Minimize state changes by grouping similar operations.

## Implementation Priority

### High Priority (Immediate Impact)
1. **Draw Command Reuse** - Easy to implement, significant performance gain
2. **Adaptive Quality** - Great UX improvement during interaction
3. **WebGL2 UBOs** - If WebGL2 support is common in your user base

### Medium Priority (Good ROI)
4. **Framebuffer Pooling** - Reduces memory allocations
5. **Batch State Changes** - Better GPU utilization
6. **Shader Precision Optimization** - Test carefully

### Low Priority (Nice to Have)
7. **Loop Unrolling** - Larger shaders, marginal gains
8. **Texture Optimization** - Already quite optimal

## Testing Recommendations

1. **Benchmark before/after** each optimization
2. **Test on mobile devices** - Often the bottleneck
3. **Profile with Chrome DevTools** - Use Performance tab and WebGL Inspector
4. **Monitor frame times** - Target 16ms (60fps) or better
5. **Test different zoom levels** - Performance varies significantly

## Code Example: Optimized Draw Command

```javascript
// In utils.js - modify createStandardDrawCommand:
export function createStandardDrawCommand(regl, params, canvas, fragmentShader, options = {}) {
  const vertexShaderSource = options.vertexShader || vertexShader;
  
  // Create reusable draw command with dynamic uniforms
  const drawCommand = regl({
    vert: vertexShaderSource,
    frag: fragmentShader,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1],
    },
    uniforms: {
      uTime: regl.prop('uTime'),
      uIterations: regl.prop('uIterations'),
      uZoom: regl.prop('uZoom'),
      uOffset: regl.prop('uOffset'),
      uResolution: regl.prop('uResolution'),
      uJuliaC: regl.prop('uJuliaC'),
      uPalette: regl.prop('uPalette'),
      uXScale: regl.prop('uXScale'),
      uYScale: regl.prop('uYScale'),
    },
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    count: 4,
    primitive: 'triangle strip',
  });

  // Return function that updates uniforms and draws
  return (uniformOverrides = {}) => {
    const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
    const juliaC = options.juliaC !== undefined 
      ? [options.juliaC.x, options.juliaC.y] 
      : (isJuliaType(options.fractalType || '') 
          ? [params.juliaC.x, params.juliaC.y] 
          : [0, 0]);

    drawCommand({
      uTime: uniformOverrides.uTime ?? options.uTime ?? 0,
      uIterations: uniformOverrides.uIterations ?? params.iterations,
      uZoom: uniformOverrides.uZoom ?? params.zoom,
      uOffset: uniformOverrides.uOffset ?? [params.offset.x, params.offset.y],
      uResolution: uniformOverrides.uResolution ?? [canvas.width, canvas.height],
      uJuliaC: uniformOverrides.uJuliaC ?? juliaC,
      uPalette: uniformOverrides.uPalette ?? paletteTexture,
      uXScale: uniformOverrides.uXScale ?? params.xScale,
      uYScale: uniformOverrides.uYScale ?? params.yScale,
    });
  };
}
```

## Notes

- Most optimizations require careful testing to ensure visual quality isn't compromised
- Some optimizations (like UBOs) require WebGL2, so provide fallbacks
- Profile before and after to measure actual impact
- Consider user experience - sometimes "good enough" performance is better than complex optimizations

