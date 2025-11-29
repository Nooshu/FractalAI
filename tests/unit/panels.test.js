import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupCollapsibleSections,
  setupPanelToggle,
  setupLeftPanelToggle,
  setupRightPanelToggle,
  setupExifEditorVisibility,
  setupDebugPanelVisibility,
  initUILayout,
} from '../../static/js/ui/panels.js';

describe('panels module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset URL to default
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });

    document.body.innerHTML = `
      <aside class="side-panel">
        <header class="panel-header">
          <button class="back-btn" title="Back"></button>
        </header>
      </aside>
      <button id="show-panel-btn"></button>
      <aside class="right-panel">
        <header class="panel-header">
          <button class="right-back-btn" title="Back"></button>
        </header>
      </aside>
      <button id="show-right-panel-btn"></button>
      <div class="section">
        <button class="section-header" data-section="one"></button>
        <div class="section-content active"></div>
      </div>
      <div class="section">
        <button class="section-header" data-section="exif-editor"></button>
        <div class="section-content"></div>
      </div>
      <div class="section">
        <button class="section-header" data-section="debug"></button>
        <div class="section-content"></div>
      </div>
    `;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('setupCollapsibleSections toggles active and collapsed classes', () => {
    const header = document.querySelector('.section-header');
    const content = document.querySelector('.section-content');

    setupCollapsibleSections();

    // Initially active
    expect(content.classList.contains('active')).toBe(true);

    header.click();
    expect(content.classList.contains('active')).toBe(false);
    expect(header.classList.contains('collapsed')).toBe(true);

    header.click();
    expect(content.classList.contains('active')).toBe(true);
    expect(header.classList.contains('collapsed')).toBe(false);
  });

  it('setupCollapsibleSections handles multiple sections', () => {
    document.body.innerHTML = `
      <div class="section">
        <button class="section-header" data-section="one"></button>
        <div class="section-content"></div>
      </div>
      <div class="section">
        <button class="section-header" data-section="two"></button>
        <div class="section-content active"></div>
      </div>
    `;

    setupCollapsibleSections();

    const headers = document.querySelectorAll('.section-header');
    const contents = document.querySelectorAll('.section-content');

    // First section - expand
    headers[0].click();
    expect(contents[0].classList.contains('active')).toBe(true);
    expect(headers[0].classList.contains('collapsed')).toBe(false);

    // Second section - collapse
    headers[1].click();
    expect(contents[1].classList.contains('active')).toBe(false);
    expect(headers[1].classList.contains('collapsed')).toBe(true);
  });

  it('setupCollapsibleSections handles sections without content', () => {
    document.body.innerHTML = `
      <div class="section">
        <button class="section-header" data-section="one"></button>
      </div>
    `;

    setupCollapsibleSections();

    const header = document.querySelector('.section-header');
    // Clicking should not throw even if content is null
    expect(() => header.click()).not.toThrow();
  });

  it('setupCollapsibleSections handles sections with null content gracefully', () => {
    document.body.innerHTML = `
      <div class="section">
        <button class="section-header" data-section="one"></button>
        <!-- No .section-content element -->
      </div>
    `;

    setupCollapsibleSections();

    const header = document.querySelector('.section-header');
    // Should not throw when content is null
    expect(() => header.click()).not.toThrow();
  });

  it('setupPanelToggle toggles side panel hidden class and calls updateRendererSize', () => {
    const updateRendererSize = vi.fn();

    setupPanelToggle(updateRendererSize);

    const sidePanel = document.querySelector('.side-panel');
    const backBtn = document.querySelector('.back-btn');
    const showPanelBtn = document.getElementById('show-panel-btn');

    // Hide
    backBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(true);

    // Fast-forward the resize timeout
    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(1);

    // Show
    showPanelBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(false);

    // Fast-forward the resize timeout
    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(2);
  });

  it('setupPanelToggle handles missing updateRendererSize callback', () => {
    setupPanelToggle();

    const sidePanel = document.querySelector('.side-panel');
    const backBtn = document.querySelector('.back-btn');
    const showPanelBtn = document.getElementById('show-panel-btn');

    // Should not throw
    backBtn.click();
    vi.runAllTimers();
    showPanelBtn.click();
    vi.runAllTimers();

    expect(sidePanel.classList.contains('hidden')).toBe(false);
  });

  it('setupPanelToggle returns early if elements are missing', () => {
    document.body.innerHTML = '';

    // Should not throw
    expect(() => setupPanelToggle()).not.toThrow();
  });

  it('setupLeftPanelToggle toggles left panel', () => {
    const updateRendererSize = vi.fn();

    setupLeftPanelToggle(updateRendererSize);

    const sidePanel = document.querySelector('.side-panel');
    const backBtn = document.querySelector('.back-btn');
    const showPanelBtn = document.getElementById('show-panel-btn');

    backBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(true);

    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(1);

    showPanelBtn.click();
    expect(sidePanel.classList.contains('hidden')).toBe(false);

    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(2);
  });

  it('setupRightPanelToggle toggles right panel', () => {
    const updateRendererSize = vi.fn();

    setupRightPanelToggle(updateRendererSize);

    const rightPanel = document.querySelector('.right-panel');
    const rightBackBtn = document.querySelector('.right-back-btn');
    const showRightPanelBtn = document.getElementById('show-right-panel-btn');

    rightBackBtn.click();
    expect(rightPanel.classList.contains('hidden')).toBe(true);

    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(1);

    showRightPanelBtn.click();
    expect(rightPanel.classList.contains('hidden')).toBe(false);

    vi.runAllTimers();
    expect(updateRendererSize).toHaveBeenCalledTimes(2);
  });

  it('setupRightPanelToggle handles missing updateRendererSize callback', () => {
    setupRightPanelToggle();

    const rightPanel = document.querySelector('.right-panel');
    const rightBackBtn = document.querySelector('.right-back-btn');
    const showRightPanelBtn = document.getElementById('show-right-panel-btn');

    rightBackBtn.click();
    vi.runAllTimers();
    showRightPanelBtn.click();
    vi.runAllTimers();

    expect(rightPanel.classList.contains('hidden')).toBe(false);
  });

  it('setupRightPanelToggle returns early if elements are missing', () => {
    document.body.innerHTML = '';

    expect(() => setupRightPanelToggle()).not.toThrow();
  });

  describe('setupExifEditorVisibility', () => {
    it('shows EXIF editor when ?exif=true is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?exif=true' },
        writable: true,
      });

      const exifSection = document.querySelector('[data-section="exif-editor"]').parentElement;

      setupExifEditorVisibility();

      expect(exifSection.classList.contains('exif-hidden')).toBe(false);
      expect(exifSection.style.display).toBe('');
    });

    it('shows EXIF editor when ?full=true is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?full=true' },
        writable: true,
      });

      setupExifEditorVisibility();

      const exifSection = document.querySelector('[data-section="exif-editor"]')?.parentElement;
      expect(exifSection).toBeDefined();
      expect(exifSection.classList.contains('exif-hidden')).toBe(false);
      expect(exifSection.style.display).toBe('');
    });

    it('hides EXIF editor when ?exif=true is not in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      });

      const exifSection = document.querySelector('[data-section="exif-editor"]').parentElement;

      setupExifEditorVisibility();

      expect(exifSection.classList.contains('exif-hidden')).toBe(true);
      expect(exifSection.style.display).toBe('none');
    });

    it('hides EXIF editor when ?exif=false is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?exif=false' },
        writable: true,
      });

      const exifSection = document.querySelector('[data-section="exif-editor"]').parentElement;

      setupExifEditorVisibility();

      expect(exifSection.classList.contains('exif-hidden')).toBe(true);
      expect(exifSection.style.display).toBe('none');
    });

    it('handles missing EXIF section gracefully', () => {
      document.body.innerHTML = '';

      expect(() => setupExifEditorVisibility()).not.toThrow();
    });
  });

  describe('setupDebugPanelVisibility', () => {
    it('shows debug panel when ?debug=true is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?debug=true' },
        writable: true,
      });

      const debugSection = document.querySelector('[data-section="debug"]').parentElement;

      setupDebugPanelVisibility();

      expect(debugSection.classList.contains('debug-hidden')).toBe(false);
      expect(debugSection.style.display).toBe('');
    });

    it('shows debug panel when ?full=true is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?full=true' },
        writable: true,
      });

      setupDebugPanelVisibility();

      const debugSection = document.querySelector('[data-section="debug"]')?.parentElement;
      expect(debugSection).toBeDefined();
      expect(debugSection.classList.contains('debug-hidden')).toBe(false);
      expect(debugSection.style.display).toBe('');
    });

    it('hides debug panel when ?debug=true is not in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      });

      const debugSection = document.querySelector('[data-section="debug"]').parentElement;

      setupDebugPanelVisibility();

      expect(debugSection.classList.contains('debug-hidden')).toBe(true);
      expect(debugSection.style.display).toBe('none');
    });

    it('hides debug panel when ?debug=false is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?debug=false' },
        writable: true,
      });

      const debugSection = document.querySelector('[data-section="debug"]').parentElement;

      setupDebugPanelVisibility();

      expect(debugSection.classList.contains('debug-hidden')).toBe(true);
      expect(debugSection.style.display).toBe('none');
    });

    it('handles missing debug section gracefully', () => {
      document.body.innerHTML = '';

      expect(() => setupDebugPanelVisibility()).not.toThrow();
    });
  });

  describe('initUILayout', () => {
    it('calls all setup functions', () => {
      const updateRendererSize = vi.fn();

      // Test that initUILayout sets up all functionality
      initUILayout(updateRendererSize);

      // Verify collapsible sections work
      const header = document.querySelector('.section-header');
      const content = document.querySelector('.section-content');
      header.click();
      expect(content.classList.contains('active')).toBe(false);

      // Verify left panel toggle works
      const sidePanel = document.querySelector('.side-panel');
      const backBtn = document.querySelector('.back-btn');
      backBtn.click();
      expect(sidePanel.classList.contains('hidden')).toBe(true);

      // Verify right panel toggle works
      const rightPanel = document.querySelector('.right-panel');
      const rightBackBtn = document.querySelector('.right-back-btn');
      rightBackBtn.click();
      expect(rightPanel.classList.contains('hidden')).toBe(true);

      // Verify EXIF visibility is set up
      const exifSection = document.querySelector('[data-section="exif-editor"]').parentElement;
      expect(exifSection.classList.contains('exif-hidden')).toBe(true);

      // Verify debug visibility is set up
      const debugSection = document.querySelector('[data-section="debug"]').parentElement;
      expect(debugSection.classList.contains('debug-hidden')).toBe(true);
    });

    it('shows both EXIF editor and debug panel when ?full=true is in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?full=true' },
        writable: true,
      });

      initUILayout();

      const exifSection = document.querySelector('[data-section="exif-editor"]')?.parentElement;
      const debugSection = document.querySelector('[data-section="debug"]')?.parentElement;
      
      expect(exifSection).toBeDefined();
      expect(debugSection).toBeDefined();
      expect(exifSection.classList.contains('exif-hidden')).toBe(false);
      expect(debugSection.classList.contains('debug-hidden')).toBe(false);
      expect(exifSection.style.display).toBe('');
      expect(debugSection.style.display).toBe('');
    });

    it('handles missing updateRendererSize callback', () => {
      expect(() => initUILayout()).not.toThrow();

      // Verify functions still work
      const header = document.querySelector('.section-header');
      header.click();
      expect(document.querySelector('.section-content').classList.contains('active')).toBe(false);
    });
  });
});


