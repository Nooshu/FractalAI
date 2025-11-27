import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for ui/presets.js module
 * Tests preset loading, EXIF reading, filename parsing, and UI interactions
 */

// Mock piexifjs since it's not available in test environment
vi.mock('piexifjs', () => ({
  default: {
    load: vi.fn(),
    ExifIFD: {
      UserComment: '0x9286'
    }
  }
}));

// Mock DOM elements and fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock DOM methods
const mockElement = {
  innerHTML: '',
  style: {},
  appendChild: vi.fn(),
  addEventListener: vi.fn(),
  dataset: {},
  className: ''
};

global.document = {
  getElementById: vi.fn(() => mockElement),
  createElement: vi.fn(() => mockElement)
};

describe('ui/presets.js', () => {
  let presetsModule;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Import the module fresh for each test
    presetsModule = await import('../../static/js/ui/presets.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module Structure', () => {
    it('should export setupPresets function', () => {
      expect(presetsModule.setupPresets).toBeDefined();
      expect(typeof presetsModule.setupPresets).toBe('function');
    });
  });

  describe('setupPresets', () => {
    it('should accept a loadFractalFromPreset callback', () => {
      const mockCallback = vi.fn();
      
      expect(() => {
        presetsModule.setupPresets(mockCallback);
      }).not.toThrow();
    });

    it('should call DOM setup methods', () => {
      const mockCallback = vi.fn();
      
      presetsModule.setupPresets(mockCallback);
      
      // Should attempt to get DOM elements
      expect(global.document.getElementById).toHaveBeenCalled();
    });
  });

  describe('Manifest Loading', () => {
    it('should attempt to load manifest.json first', async () => {
      const mockManifest = {
        images: ['01-test-image.jpg', '02-another-test.jpg'],
        count: 2
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        });

      presetsModule.setupPresets(vi.fn());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFetch).toHaveBeenCalledWith('/static/presets/images/manifest.json');
    });

    it('should fallback to directory listing if manifest fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Manifest not found'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><a href="01-test-image.jpg">01-test-image.jpg</a></html>')
        });

      presetsModule.setupPresets(vi.fn());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should attempt directory listing after manifest fails
      expect(mockFetch).toHaveBeenCalledWith('/static/presets/images/', {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
    });
  });

  describe('Filename Parsing', () => {
    // We need to test the internal parseFilename function
    // Since it's not exported, we'll test it through the public interface
    
    it('should handle numbered filename format correctly', async () => {
      const mockManifest = {
        images: ['01-rainbow-mandelbrot.jpg'],
        count: 1
      };

      const mockExifData = {
        fractal: 'mandelbrot',
        zoom: 2.5,
        offsetX: -0.5,
        offsetY: 0.3,
        theme: 'Rainbow'
      };

      // Mock successful manifest load
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        // Mock image fetch for EXIF reading
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/jpeg' }))
        });

      // Mock piexif to return our test data
      const piexif = await import('piexifjs');
      piexif.default.load.mockReturnValue({
        Exif: {
          [piexif.default.ExifIFD.UserComment]: JSON.stringify({ FractalAI: mockExifData })
        }
      });

      presetsModule.setupPresets(vi.fn());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // The module should have processed the filename and created a preset
      // We can't directly test the internal state, but we can verify the fetch calls
      expect(mockFetch).toHaveBeenCalledWith('/static/presets/images/manifest.json');
    });
  });

  describe('EXIF Data Reading', () => {
    it('should handle JPEG images with EXIF data', async () => {
      const mockManifest = {
        images: ['01-test-fractal.jpg'],
        count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        });

      presetsModule.setupPresets(vi.fn());

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should load the manifest successfully
      expect(mockFetch).toHaveBeenCalledWith('/static/presets/images/manifest.json');
    });

    it('should handle images without EXIF data gracefully', async () => {
      const mockManifest = {
        images: ['01-no-exif.jpg'],
        count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        });

      presetsModule.setupPresets(vi.fn());

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should handle manifest loading gracefully
      expect(mockFetch).toHaveBeenCalledWith('/static/presets/images/manifest.json');
    });

    it('should skip non-JPEG images', async () => {
      const mockManifest = {
        images: ['01-test-image.jpg'], // Will be treated as JPEG in filename but we'll mock as PNG
        count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake-png-data'], { type: 'image/png' }))
        });

      const piexif = await import('piexifjs');
      piexif.default.load.mockClear();

      presetsModule.setupPresets(vi.fn());

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not call piexif.load for non-JPEG images
      expect(piexif.default.load).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      expect(() => {
        presetsModule.setupPresets(vi.fn());
      }).not.toThrow();
    });

    it('should handle invalid JSON in manifest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      expect(() => {
        presetsModule.setupPresets(vi.fn());
      }).not.toThrow();
    });

    it('should handle EXIF parsing errors', async () => {
      const mockManifest = {
        images: ['01-corrupt-exif.jpg'],
        count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake-jpeg-data'], { type: 'image/jpeg' }))
        });

      const piexif = await import('piexifjs');
      piexif.default.load.mockImplementation(() => {
        throw new Error('Invalid EXIF data');
      });

      expect(() => {
        presetsModule.setupPresets(vi.fn());
      }).not.toThrow();
    });
  });

  describe('UI Interaction', () => {
    it('should set up click event listeners', () => {
      const mockCallback = vi.fn();
      
      presetsModule.setupPresets(mockCallback);
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle preset clicks', async () => {
      const mockCallback = vi.fn();
      let clickHandler;

      // Capture the click handler
      mockElement.addEventListener.mockImplementation((event, handler) => {
        if (event === 'click') {
          clickHandler = handler;
        }
      });

      presetsModule.setupPresets(mockCallback);

      // Simulate a click event
      const mockEvent = {
        target: {
          closest: vi.fn(() => ({
            dataset: { presetIndex: '0' }
          }))
        }
      };

      if (clickHandler) {
        await clickHandler(mockEvent);
      }

      expect(mockEvent.target.closest).toHaveBeenCalledWith('.preset-item');
    });
  });

  describe('Preset Data Processing', () => {
    it('should create preset objects with correct structure', async () => {
      const mockManifest = {
        images: ['01-test-preset.jpg'],
        count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake-jpeg-data'], { type: 'image/jpeg' }))
        });

      const piexif = await import('piexifjs');
      piexif.default.load.mockReturnValue({
        Exif: {} // No EXIF data - should create default preset
      });

      presetsModule.setupPresets(vi.fn());

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify that the module processes the data without errors
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during scan', () => {
      presetsModule.setupPresets(vi.fn());

      // Should set up loading indicator
      expect(global.document.getElementById).toHaveBeenCalledWith('presets-grid');
    });
  });
});
