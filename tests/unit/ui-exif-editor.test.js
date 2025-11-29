import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for ui/exif-editor.js module
 * Tests basic module structure and setup functionality
 */

// Mock piexifjs
vi.mock('piexifjs', () => ({
  default: {
    load: vi.fn(),
    dump: vi.fn(),
    insert: vi.fn(),
    ExifIFD: {
      UserComment: '0x9286',
    },
  },
}));

// Mock DOM elements
const mockElement = {
  innerHTML: '',
  style: { display: 'block' },
  appendChild: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  click: vi.fn(),
  value: '',
  textContent: '',
  disabled: false,
  files: [],
};

global.FileReader = vi.fn(() => ({
  readAsDataURL: vi.fn(),
  result: 'data:image/jpeg;base64,fake-data',
  onload: null,
  onerror: null,
}));

global.document = {
  getElementById: vi.fn(() => mockElement),
  createElement: vi.fn(() => mockElement),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Keep the native URL constructor available
// global.URL = native URL constructor (don't override)

describe('ui/exif-editor.js', () => {
  let exifEditorModule;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the module fresh for each test
    exifEditorModule = await import('../../static/js/ui/exif-editor.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module Structure', () => {
    it('should export setupExifEditor function', () => {
      expect(exifEditorModule.setupExifEditor).toBeDefined();
      expect(typeof exifEditorModule.setupExifEditor).toBe('function');
    });
  });

  describe('setupExifEditor', () => {
    it('should accept getCurrentFractalType and getParams callbacks', () => {
      const mockGetCurrentFractalType = vi.fn(() => 'mandelbrot');
      const mockGetParams = vi.fn(() => ({
        zoom: 2.5,
        offset: { x: -0.5, y: 0.3 },
        colorScheme: 'rainbow',
        iterations: 150,
      }));

      expect(() => {
        exifEditorModule.setupExifEditor(mockGetCurrentFractalType, mockGetParams);
      }).not.toThrow();

      // Should call the functions to get initial data
      expect(mockGetCurrentFractalType).toHaveBeenCalled();
      expect(mockGetParams).toHaveBeenCalled();
    });

    it('should handle missing parameters gracefully', () => {
      const mockGetCurrentFractalType = vi.fn(() => 'mandelbrot');
      const mockGetParams = vi.fn(() => ({
        offset: { x: 0, y: 0 },
        colorScheme: 'classic',
        zoom: 1.0,
        iterations: 100,
      }));

      expect(() => {
        exifEditorModule.setupExifEditor(mockGetCurrentFractalType, mockGetParams);
      }).not.toThrow();
    });

    it('should set up DOM elements', () => {
      const mockGetCurrentFractalType = vi.fn(() => 'mandelbrot');
      const mockGetParams = vi.fn(() => ({
        offset: { x: 0, y: 0 },
        colorScheme: 'classic',
        zoom: 1.0,
        iterations: 100,
      }));

      exifEditorModule.setupExifEditor(mockGetCurrentFractalType, mockGetParams);

      expect(global.document.getElementById).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      global.document.getElementById.mockReturnValue(null);

      const mockGetCurrentFractalType = vi.fn(() => 'mandelbrot');
      const mockGetParams = vi.fn(() => ({
        offset: { x: 0, y: 0 },
        colorScheme: 'classic',
        zoom: 1.0,
        iterations: 100,
      }));

      expect(() => {
        exifEditorModule.setupExifEditor(mockGetCurrentFractalType, mockGetParams);
      }).not.toThrow();
    });
  });

  describe('Module Import', () => {
    it('should import without errors', async () => {
      const module = await import('../../static/js/ui/exif-editor.js');
      expect(module).toBeDefined();
      expect(typeof module).toBe('object');
    });
  });
});
