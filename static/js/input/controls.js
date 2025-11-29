/**
 * Input Controls Module
 * Complex event handling module for managing user input interactions
 * Handles mouse, keyboard, and wheel events for panning, zooming, and selection
 */

/**
 * Setup input controls for canvas interactions
 * @param {Object} getters - Getter functions for accessing state
 * @param {Function} getters.getCanvas - Get canvas element
 * @param {Function} getters.getParams - Get params object
 * @param {Function} getters.getUpdateRendererSize - Get updateRendererSize function
 * @param {Object} callbacks - Callback functions for actions
 * @param {Function} callbacks.scheduleRender - Schedule a render
 * @param {Function} callbacks.updateCoordinateDisplay - Update coordinate display
 * @param {Function} callbacks.renderFractalProgressive - Render fractal progressively
 * @param {Function} callbacks.zoomToSelection - Zoom to selection box
 * @returns {Object} Object with cleanup function
 */
export function setupInputControls(getters, callbacks) {
  const { getCanvas, getParams, getUpdateRendererSize } = getters;
  const { scheduleRender, updateCoordinateDisplay, renderFractalProgressive, zoomToSelection } =
    callbacks;

  const canvas = getCanvas();
  const canvasContainer = canvas.parentElement;
  const selectionBox = document.getElementById('selection-box');

  if (!canvas || !selectionBox) {
    console.warn('Canvas or selection box not found');
    return { cleanup: () => {} };
  }

  // Create hover coordinates tooltip element
  const hoverCoords = document.createElement('div');
  hoverCoords.id = 'hover-coords-tooltip';
  hoverCoords.style.position = 'absolute';
  hoverCoords.style.pointerEvents = 'none';
  hoverCoords.style.background = 'rgba(0, 0, 0, 0.75)';
  hoverCoords.style.color = '#fff';
  hoverCoords.style.padding = '4px 8px';
  hoverCoords.style.borderRadius = '4px';
  hoverCoords.style.fontSize = '11px';
  hoverCoords.style.fontFamily = 'Courier New, monospace';
  hoverCoords.style.border = '1px solid rgba(255, 255, 255, 0.3)';
  hoverCoords.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.6)';
  hoverCoords.style.zIndex = '120';
  hoverCoords.style.display = 'none';
  canvasContainer.appendChild(hoverCoords);

  // Internal state
  let isDragging = false;
  let isSelecting = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let selectionStartX = 0;
  let selectionStartY = 0;
  let cachedCanvasRect = null;
  let originalIterations = null; // Store original iterations when dragging starts

  // Helper to get canvas rect (cached for performance)
  const getCanvasRect = () => {
    // Invalidate cache on resize or after a delay
    if (!cachedCanvasRect) {
      cachedCanvasRect = canvas.getBoundingClientRect();
      // Invalidate cache after 100ms to allow for resize
      setTimeout(() => {
        cachedCanvasRect = null;
      }, 100);
    }
    return cachedCanvasRect;
  };

  // Helper to convert client coordinates to fractal coordinates
  const getFractalCoordsFromClient = (clientX, clientY) => {
    const params = getParams();
    const rect = getCanvasRect();

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    if (displayWidth === 0 || displayHeight === 0 || canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    const uvX = mouseX / displayWidth;
    const uvY = mouseY / displayHeight;

    const rendererWidth = canvas.width;
    const rendererHeight = canvas.height;
    const aspect = rendererWidth / rendererHeight;

    const scale = 4.0 / params.zoom;
    const fractalX = (uvX - 0.5) * scale * aspect * params.xScale + params.offset.x;
    const fractalY = (uvY - 0.5) * scale * params.yScale + params.offset.y;

    return { x: fractalX, y: fractalY, mouseX, mouseY };
  };

  // Mouse down handler
  const handleMouseDown = (e) => {
    // Only start dragging on left mouse button
    if (e.button === 0) {
      // Check if the click is on a fullscreen control button - if so, don't handle it
      const target = e.target;
      if (target.closest?.('.fullscreen-control-btn')) {
        return; // Let the button handle its own click
      }

      const rect = getCanvasRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Ctrl-click: precise zoom into hovered coordinate
      if (e.ctrlKey) {
        const coords = getFractalCoordsFromClient(e.clientX, e.clientY);
        if (coords) {
          const params = getParams();
          // Zoom in by a factor (same as double-click)
          const zoomFactor = 2.0;
          params.zoom *= zoomFactor;
          params.offset.x = coords.x;
          params.offset.y = coords.y;
          updateCoordinateDisplay();
          renderFractalProgressive();
        }
        e.preventDefault();
        return;
      }

      // Check if Shift key is held for selection mode
      if (e.shiftKey) {
        // Start selection box
        isSelecting = true;
        isDragging = false;
        selectionStartX = mouseX;
        selectionStartY = mouseY;
        selectionBox.style.left = mouseX + 'px';
        selectionBox.style.top = mouseY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.classList.add('active');
        canvas.style.cursor = 'crosshair';
        e.preventDefault();
      } else {
        // Start panning
        isDragging = true;
        isSelecting = false;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        selectionBox.classList.remove('active');

        // Store original iterations and reduce to 100 for faster panning
        const params = getParams();
        if (originalIterations === null && params.iterations > 100) {
          originalIterations = params.iterations;
          params.iterations = 100;
        }

        // Prevent text selection while dragging
        e.preventDefault();
      }
    }
  };

  // Mouse move handler
  const handleMouseMove = (e) => {
    // Don't interfere if mouse is over fullscreen control buttons
    const target = e.target;
    if (target.closest?.('.fullscreen-control-btn')) {
      return; // Let buttons handle their own hover states
    }

    const params = getParams();

    if (isSelecting) {
      // Update selection box - constrained to render buffer aspect ratio
      const rect = getCanvasRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate render buffer aspect ratio (must match what the shader uses)
      // This ensures the selection box matches the actual fractal coordinates
      const renderBufferAspect = canvas.width / canvas.height;

      // Calculate raw dimensions from start point
      const rawWidth = mouseX - selectionStartX;
      const rawHeight = mouseY - selectionStartY;

      // Determine which dimension to use as the base (use the larger one)
      let width, height;
      if (Math.abs(rawWidth / renderBufferAspect) > Math.abs(rawHeight)) {
        // Width is the constraining dimension
        width = rawWidth;
        height = width / renderBufferAspect;
      } else {
        // Height is the constraining dimension
        height = rawHeight;
        width = height * renderBufferAspect;
      }

      // Calculate position (ensure box grows from start point)
      let left = rawWidth >= 0 ? selectionStartX : selectionStartX + width;
      let top = rawHeight >= 0 ? selectionStartY : selectionStartY + height;

      // Ensure selection box stays within canvas bounds
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);

      // Clamp position to keep box within bounds
      left = Math.max(0, Math.min(left, rect.width - absWidth));
      top = Math.max(0, Math.min(top, rect.height - absHeight));

      // Clamp dimensions if they exceed bounds
      const maxWidth = rect.width - left;
      const maxHeight = rect.height - top;

      if (absWidth > maxWidth || absHeight > maxHeight) {
        // Recalculate to fit within bounds while maintaining aspect ratio
        const scaleByWidth = maxWidth / absWidth;
        const scaleByHeight = maxHeight / absHeight;
        const scale = Math.min(scaleByWidth, scaleByHeight);

        width = width * scale;
        height = height * scale;
      }

      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = Math.abs(width) + 'px';
      selectionBox.style.height = Math.abs(height) + 'px';
    } else if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;

      // Dead-band: ignore very small movements to avoid unnecessary recomputes
      const DEAD_BAND_THRESHOLD = 2; // pixels
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX < DEAD_BAND_THRESHOLD && absDeltaY < DEAD_BAND_THRESHOLD) {
        // Movement too small, skip update
        return;
      }

      // Adjust sensitivity based on zoom level for better control
      // Sensitivity decreases with zoom to allow precise panning at high zoom levels
      // Base sensitivity of 0.001 works well at zoom 1, and scales inversely with zoom
      const baseSensitivity = 0.001;
      const sensitivity = baseSensitivity / params.zoom;
      params.offset.x -= deltaX * sensitivity;
      params.offset.y += deltaY * sensitivity;
      updateCoordinateDisplay();
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      scheduleRender(); // Use throttled render for smooth panning
    }
  };

  // Mouse up handler
  const handleMouseUp = (e) => {
    if (e.button === 0) {
      if (isSelecting) {
        // Zoom into selection box - use the actual displayed box dimensions
        const rect = getCanvasRect();

        // Get the actual selection box position and size from the DOM
        // This ensures we use the constrained aspect-ratio box that's displayed
        const boxLeft = parseFloat(selectionBox.style.left) || 0;
        const boxTop = parseFloat(selectionBox.style.top) || 0;
        const boxWidth = parseFloat(selectionBox.style.width) || 0;
        const boxHeight = parseFloat(selectionBox.style.height) || 0;

        // Validate selection box dimensions
        if (isNaN(boxLeft) || isNaN(boxTop) || isNaN(boxWidth) || isNaN(boxHeight)) {
          console.warn('Selection box has invalid dimensions (NaN)');
          isSelecting = false;
          selectionBox.classList.remove('active');
          canvas.style.cursor = 'grab';
          return;
        }

        // Only zoom if selection box is large enough (at least 10x10 pixels)
        if (boxWidth > 10 && boxHeight > 10) {
          // Calculate end coordinates from the box position and size
          const startX = boxLeft;
          const startY = boxTop;
          const endX = boxLeft + boxWidth;
          const endY = boxTop + boxHeight;

          // Validate coordinates before zooming
          if (isFinite(startX) && isFinite(startY) && isFinite(endX) && isFinite(endY)) {
            zoomToSelection(startX, startY, endX, endY, rect);
          } else {
            console.warn('Selection box coordinates are invalid (Infinity)');
          }
        }

        isSelecting = false;
        selectionBox.classList.remove('active');
        canvas.style.cursor = 'grab';
      } else if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';

        // Restore original iterations and trigger full render
        if (originalIterations !== null) {
          const params = getParams();
          params.iterations = originalIterations;
          originalIterations = null;
          // Trigger a full render with restored iterations
          renderFractalProgressive();
        }
      }
    }
  };

  // Mouse leave handler
  const handleMouseLeave = () => {
    if (isDragging) {
      // If mouse leaves while dragging, stop dragging and restore iterations
      isDragging = false;
      canvas.style.cursor = 'grab';

      // Restore original iterations and trigger full render
      if (originalIterations !== null) {
        const params = getParams();
        params.iterations = originalIterations;
        originalIterations = null;
        // Trigger a full render with restored iterations
        renderFractalProgressive();
      }
    } else if (!isSelecting) {
      canvas.style.cursor = 'grab';
    }

    // Hide hover coordinates when leaving canvas
    hoverCoords.style.display = 'none';
  };

  // Update cursor based on modifier keys
  const updateCursor = (modifierActive) => {
    if (!isDragging && !isSelecting) {
      canvas.style.cursor = modifierActive ? 'crosshair' : 'grab';
    }
  };

  // Canvas mouse move handler (for cursor updates and hover coordinates)
  const handleCanvasMouseMove = (e) => {
    if (!isDragging && !isSelecting) {
      const modifierActive = e.shiftKey || e.ctrlKey;
      updateCursor(modifierActive);

      if (e.ctrlKey) {
        const coords = getFractalCoordsFromClient(e.clientX, e.clientY);
        if (coords) {
          hoverCoords.style.display = 'block';
          // Position tooltip near the mouse pointer, within canvas container
          const rect = getCanvasRect();
          const offsetX = 12;
          const offsetY = 12;
          let tooltipX = coords.mouseX + offsetX;
          let tooltipY = coords.mouseY + offsetY;
          // Keep tooltip inside canvas bounds
          const maxX = rect.width - 120; // rough width
          const maxY = rect.height - 30; // rough height
          tooltipX = Math.max(0, Math.min(tooltipX, maxX));
          tooltipY = Math.max(0, Math.min(tooltipY, maxY));
          hoverCoords.style.left = `${tooltipX}px`;
          hoverCoords.style.top = `${tooltipY}px`;
          hoverCoords.textContent = `x: ${coords.x.toFixed(4)}, y: ${coords.y.toFixed(4)}`;
        }
      } else {
        hoverCoords.style.display = 'none';
      }
    }
  };

  // Context menu handler - prevent default context menu on canvas/container
  const handleContextMenu = (e) => {
    // Always prevent the native context menu on the fractal canvas area,
    // especially for Ctrl+Click on macOS
    e.preventDefault();
  };

  // Keyboard handlers
  const handleKeyDown = (e) => {
    if (e.key === 'Shift' || e.key === 'Control') {
      updateCursor(e.shiftKey || e.ctrlKey);
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === 'Shift' || e.key === 'Control') {
      updateCursor(e.shiftKey || e.ctrlKey);
      if (!e.ctrlKey) {
        hoverCoords.style.display = 'none';
      }
    }
  };

  // Double-click handler
  const handleDoubleClick = (e) => {
    // Check if the click is on a fullscreen control button - if so, don't zoom
    const target = e.target;
    if (target.closest?.('.fullscreen-control-btn')) {
      return; // Let the button handle its own click
    }

    // The fullscreen-controls container has pointer-events: none, so clicks pass through
    // We only need to check if we're actually clicking on a button (already done above)
    // Allow handling if clicking on canvas, container, or anywhere in the canvas container
    if (
      target === canvas ||
      target === canvasContainer ||
      canvas.contains(target) ||
      canvasContainer.contains(target)
    ) {
      // Continue with zoom logic - clicks pass through the controls container
    } else {
      return; // Not clicking on canvas area
    }

    e.preventDefault();
    e.stopPropagation();

    // Ensure renderer size is up-to-date (important for fullscreen mode)
    const updateRendererSize = getUpdateRendererSize();
    if (updateRendererSize) {
      updateRendererSize();
    }

    const params = getParams();

    // Get canvas bounding rect for mouse position (use cached version)
    const rect = getCanvasRect();

    // Calculate mouse position relative to canvas (0 to 1)
    // UV coordinates are based on the geometry, which uses display dimensions
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Ensure we have valid dimensions
    if (displayWidth === 0 || displayHeight === 0) {
      console.warn('Invalid canvas dimensions for double-click zoom');
      return;
    }

    const uvX = mouseX / displayWidth;
    const uvY = mouseY / displayHeight;

    // Get the canvas's actual pixel dimensions (which the shader uses for uResolution)
    // The shader calculates aspect as uResolution.x / uResolution.y
    // Note: pixel ratio affects both dimensions equally, so aspect should match display aspect
    // But we use canvas dimensions to match exactly what the shader sees
    const rendererWidth = canvas.width;
    const rendererHeight = canvas.height;

    // Ensure we have valid renderer dimensions
    if (rendererWidth === 0 || rendererHeight === 0) {
      console.warn('Invalid renderer dimensions for double-click zoom');
      return;
    }

    const aspect = rendererWidth / rendererHeight;

    // Convert to fractal coordinates using the exact same formula as the shader
    // Shader: (uv.x - 0.5) * scale * aspect * uXScale + uOffset.x
    // where scale = 4.0 / uZoom
    const scale = 4.0 / params.zoom;
    const fractalX = (uvX - 0.5) * scale * aspect * params.xScale + params.offset.x;
    const fractalY = (uvY - 0.5) * scale * params.yScale + params.offset.y;

    // Zoom in by a factor (e.g., 2x)
    const zoomFactor = 2.0;
    params.zoom *= zoomFactor;

    // Center on the clicked point by setting offset to the fractal coordinate
    // After zooming, when uv = 0.5 (center), the formula becomes:
    // (0.5 - 0.5) * (4.0 / newZoom) * aspect * xScale + offset = offset
    // So setting offset to the fractal coordinate centers it correctly
    params.offset.x = fractalX;
    params.offset.y = fractalY;
    updateCoordinateDisplay();

    // Use progressive rendering for faster feedback
    renderFractalProgressive();
  };

  // Wheel handler - throttled to one update per animation frame
  let wheelUpdateScheduled = false;
  let pendingWheelDelta = 0;

  const handleWheel = (e) => {
    e.preventDefault();

    // Accumulate wheel delta for smoother zooming when scrolling fast
    pendingWheelDelta += e.deltaY;

    // Schedule update if not already scheduled (throttle to one per frame)
    if (!wheelUpdateScheduled) {
      wheelUpdateScheduled = true;
      requestAnimationFrame(() => {
        wheelUpdateScheduled = false;
        const params = getParams();

        // Apply accumulated delta with dead-band to avoid tiny zooms
        const DEAD_BAND_THRESHOLD = 5; // pixels
        if (Math.abs(pendingWheelDelta) < DEAD_BAND_THRESHOLD) {
          pendingWheelDelta = 0;
          return;
        }

        // Reversed logic: deltaY > 0 (pinch out/spread fingers) should zoom in, deltaY < 0 (pinch in) should zoom out
        // Use exponential zoom for smoother experience
        const zoomFactor = pendingWheelDelta > 0 ? 0.95 : 1.05;
        params.zoom *= zoomFactor;
        updateCoordinateDisplay();
        scheduleRender(); // Use throttled render for smooth zooming

        // Reset accumulated delta
        pendingWheelDelta = 0;
      });
    }
  };

  // Unified pointer event handlers (replaces separate mouse/touch handlers where possible)
  // Pointer events provide better cross-device support and can be more efficient
  const handlePointerDown = (e) => {
    // Convert pointer event to mouse-like event for existing handler
    const mouseEvent = {
      ...e,
      button: e.button || (e.pointerType === 'touch' ? 0 : e.button),
      clientX: e.clientX,
      clientY: e.clientY,
      shiftKey: e.shiftKey,
      preventDefault: () => e.preventDefault(),
      target: e.target,
    };
    handleMouseDown(mouseEvent);
  };

  const handlePointerMove = (e) => {
    // Convert pointer event to mouse-like event for existing handler
    const mouseEvent = {
      ...e,
      clientX: e.clientX,
      clientY: e.clientY,
      shiftKey: e.shiftKey,
      target: e.target,
      closest: e.target.closest?.bind(e.target),
    };
    handleMouseMove(mouseEvent);
  };

  const handlePointerUp = (e) => {
    // Convert pointer event to mouse-like event for existing handler
    const mouseEvent = {
      ...e,
      button: e.button || 0,
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target,
    };
    handleMouseUp(mouseEvent);
  };

  // Attach event listeners
  // Use pointer events for unified mouse/touch handling (better performance and cross-device support)
  if (window.PointerEvent) {
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    canvas.addEventListener('pointerleave', handleMouseLeave, { passive: true });
    canvas.addEventListener('pointermove', handleCanvasMouseMove, { passive: true });
  } else {
    // Fallback to mouse events for older browsers
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    canvas.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    canvas.addEventListener('mousemove', handleCanvasMouseMove, { passive: true });
  }

  canvas.addEventListener('contextmenu', handleContextMenu);
  canvasContainer.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvasContainer.addEventListener('dblclick', handleDoubleClick);
  // Use passive: false for wheel to allow preventDefault, but optimize other events
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  // Cleanup function
  const cleanup = () => {
    if (window.PointerEvent) {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handleMouseLeave);
      canvas.removeEventListener('pointermove', handleCanvasMouseMove);
    } else {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
    }
    canvas.removeEventListener('contextmenu', handleContextMenu);
    canvasContainer.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('dblclick', handleDoubleClick);
    canvasContainer.removeEventListener('dblclick', handleDoubleClick);
    canvas.removeEventListener('wheel', handleWheel);
  };

  return { cleanup };
}

/**
 * Zoom into a selection box area
 * @param {number} startX - Start X coordinate in pixels
 * @param {number} startY - Start Y coordinate in pixels
 * @param {number} endX - End X coordinate in pixels
 * @param {number} endY - End Y coordinate in pixels
 * @param {DOMRect} canvasRect - Canvas bounding rectangle
 * @param {Object} getters - Getter functions
 * @param {Function} getters.getCanvas - Get canvas element
 * @param {Function} getters.getParams - Get params object
 * @param {Function} callbacks - Callback functions
 * @param {Function} callbacks.renderFractalProgressive - Render fractal progressively
 */
export function zoomToSelection(startX, startY, endX, endY, canvasRect, getters, callbacks) {
  const { getCanvas, getParams } = getters;
  const { renderFractalProgressive } = callbacks;

  const canvas = getCanvas();
  const params = getParams();

  // Validate input dimensions
  const displayWidth = canvasRect.width;
  const displayHeight = canvasRect.height;

  if (!displayWidth || !displayHeight || displayWidth <= 0 || displayHeight <= 0) {
    console.warn('Invalid canvas dimensions for zoom to selection');
    return;
  }

  // Validate selection coordinates
  if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
    console.warn('Invalid selection coordinates (NaN)');
    return;
  }

  // Clamp coordinates to canvas bounds
  const clampedStartX = Math.max(0, Math.min(startX, displayWidth));
  const clampedStartY = Math.max(0, Math.min(startY, displayHeight));
  const clampedEndX = Math.max(0, Math.min(endX, displayWidth));
  const clampedEndY = Math.max(0, Math.min(endY, displayHeight));

  // Normalize coordinates to 0-1 (UV space)
  const x1 = Math.min(clampedStartX, clampedEndX) / displayWidth;
  const y1 = Math.min(clampedStartY, clampedEndY) / displayHeight;
  const x2 = Math.max(clampedStartX, clampedEndX) / displayWidth;
  const y2 = Math.max(clampedStartY, clampedEndY) / displayHeight;

  // Validate normalized coordinates
  if (x1 === x2 || y1 === y2) {
    console.warn('Selection box has zero width or height');
    return;
  }

  // Get canvas dimensions for aspect calculation (matches shader's uResolution)
  // The shader uses: aspect = uResolution.x / uResolution.y
  const rendererWidth = canvas.width;
  const rendererHeight = canvas.height;

  if (!rendererWidth || !rendererHeight || rendererWidth <= 0 || rendererHeight <= 0) {
    console.warn('Invalid renderer dimensions for zoom to selection');
    return;
  }

  const aspect = rendererWidth / rendererHeight;

  if (!isFinite(aspect) || aspect <= 0) {
    console.warn('Invalid aspect ratio calculated');
    return;
  }

  // Validate current zoom
  if (!params.zoom || !isFinite(params.zoom) || params.zoom <= 0) {
    console.warn('Invalid current zoom level');
    return;
  }

  // Calculate fractal coordinates for the selection corners
  // This matches the shader formula: (uv - 0.5) * scale * aspect * uXScale + uOffset
  const scale = 4.0 / params.zoom;

  // Top-left corner (x1, y1)
  const fractalX1 = (x1 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY1 = (y1 - 0.5) * scale * params.yScale + params.offset.y;

  // Bottom-right corner (x2, y2)
  const fractalX2 = (x2 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY2 = (y2 - 0.5) * scale * params.yScale + params.offset.y;

  // Validate fractal coordinates
  if (
    !isFinite(fractalX1) ||
    !isFinite(fractalY1) ||
    !isFinite(fractalX2) ||
    !isFinite(fractalY2)
  ) {
    console.warn('Invalid fractal coordinates calculated (NaN or Infinity)');
    return;
  }

  // Calculate center and size of selection in fractal space
  const centerX = (fractalX1 + fractalX2) / 2;
  const centerY = (fractalY1 + fractalY2) / 2;
  const width = Math.abs(fractalX2 - fractalX1);
  const height = Math.abs(fractalY2 - fractalY1);

  // Validate selection size in fractal space
  if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
    console.warn('Invalid selection size in fractal space');
    return;
  }

  // Calculate new zoom to fit the selection
  // The selection should fill the viewport after zooming
  // After zooming, the viewport will show: 4.0 / newZoom in fractal space
  // We want the selection to fill this viewport

  // Calculate the required viewport size in fractal space
  // The viewport in fractal space has dimensions:
  // width: (4.0 / newZoom) * aspect * xScale
  // height: (4.0 / newZoom) * yScale
  // We want these to match the selection dimensions

  // Solve for newZoom:
  // width = (4.0 / newZoom) * aspect * xScale  =>  newZoom = (4.0 * aspect * xScale) / width
  // height = (4.0 / newZoom) * yScale  =>  newZoom = (4.0 * yScale) / height

  // Use the larger zoom value to ensure the selection fits within the viewport
  // This ensures that the entire selection is visible after zooming
  const zoomByWidth = (4.0 * aspect * params.xScale) / width;
  const zoomByHeight = (4.0 * params.yScale) / height;

  // Validate zoom calculations
  if (!isFinite(zoomByWidth) || !isFinite(zoomByHeight) || zoomByWidth <= 0 || zoomByHeight <= 0) {
    console.warn('Invalid zoom calculation (NaN, Infinity, or <= 0)');
    return;
  }

  // Use the larger zoom value to ensure the selection fits
  // This means the selection will fill one dimension and fit within the other
  const newZoom = Math.max(zoomByWidth, zoomByHeight);

  // Validate final zoom value and apply reasonable bounds
  if (!isFinite(newZoom) || newZoom <= 0) {
    console.warn('Final zoom value is invalid');
    return;
  }

  // Apply reasonable zoom bounds (prevent extreme zoom levels that cause blank screens)
  const minZoom = 0.1;
  const maxZoom = 1e10; // Very high but still finite
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

  // Validate center coordinates
  if (!isFinite(centerX) || !isFinite(centerY)) {
    console.warn('Invalid center coordinates');
    return;
  }

  // Update parameters
  params.zoom = clampedZoom;
  params.offset.x = centerX;
  params.offset.y = centerY;

  // Render the new view
  renderFractalProgressive();
}
