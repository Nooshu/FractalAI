import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for discovery/discovery-algorithm.js
 * Tests the fractal discovery algorithm functions
 */

describe('discovery/discovery-algorithm', () => {
  let isValidInterestingView;

  beforeEach(() => {
    isValidInterestingView = vi.fn(() => true);
  });

  it('should export all required functions', async () => {
    const module = await import('../../static/js/discovery/discovery-algorithm.js');
    expect(module).toHaveProperty('extractFeatures');
    expect(module).toHaveProperty('heuristicScore');
    expect(module).toHaveProperty('mlScore');
    expect(module).toHaveProperty('hybridScore');
    expect(module).toHaveProperty('generateCandidates');
    expect(module).toHaveProperty('discoverInterestingFractals');
  });

  describe('extractFeatures', () => {
    it('should extract features from a fractal configuration', async () => {
      const { extractFeatures } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config = {
        fractalType: 'mandelbrot',
        zoom: 2.5,
        offsetX: 0.5,
        offsetY: -0.3,
        iterations: 150,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaCX: 0,
        juliaCY: 0,
      };
      const features = extractFeatures(config);
      expect(features).toBeInstanceOf(Array);
      expect(features).toHaveLength(11);
      expect(features.every(f => typeof f === 'number')).toBe(true);
    });

    it('should normalize features correctly', async () => {
      const { extractFeatures } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config = {
        fractalType: 'mandelbrot',
        zoom: 10,
        offsetX: 1,
        offsetY: 1,
        iterations: 200,
        xScale: 1.5,
        yScale: 1.5,
        juliaCX: 0.5,
        juliaCY: 0.5,
      };
      const features = extractFeatures(config);
      // Check that features are normalized (between reasonable ranges)
      expect(features[0]).toBeGreaterThan(0); // Type hash
      expect(features[1]).toBeGreaterThan(0); // Log zoom
      expect(features[1]).toBeLessThan(1);
    });
  });

  describe('heuristicScore', () => {
    it('should return a score between 0 and 1', async () => {
      const { heuristicScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = heuristicScore(config, isValidInterestingView);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return low score for invalid interesting view', async () => {
      const { heuristicScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const invalidView = vi.fn(() => false);
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = heuristicScore(config, invalidView);
      expect(score).toBe(0.1);
    });

    it('should prefer moderate zoom levels', async () => {
      const { heuristicScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config1 = { fractalType: 'mandelbrot', zoom: 1.0, offsetX: 0, offsetY: 0, iterations: 125 };
      const config2 = { fractalType: 'mandelbrot', zoom: 1000, offsetX: 0, offsetY: 0, iterations: 125 };
      const score1 = heuristicScore(config1, isValidInterestingView);
      const score2 = heuristicScore(config2, isValidInterestingView);
      expect(score1).toBeGreaterThan(score2);
    });

    it('should prefer views near origin', async () => {
      const { heuristicScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config1 = { fractalType: 'mandelbrot', zoom: 1.0, offsetX: 0, offsetY: 0, iterations: 125 };
      const config2 = { fractalType: 'mandelbrot', zoom: 1.0, offsetX: 3, offsetY: 3, iterations: 125 };
      const score1 = heuristicScore(config1, isValidInterestingView);
      const score2 = heuristicScore(config2, isValidInterestingView);
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('mlScore', () => {
    it('should fallback to heuristic when model is null', async () => {
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = await mlScore(config, null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should use model when available', async () => {
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      // Mock Synaptic model
      const mockModel = {
        activate: vi.fn(() => [0.75]),
      };
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = await mlScore(config, mockModel);
      expect(mockModel.activate).toHaveBeenCalled();
      expect(score).toBe(0.75);
    });

    it('should handle model errors gracefully', async () => {
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const mockModel = {
        activate: vi.fn(() => {
          throw new Error('Model error');
        }),
      };
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const score = await mlScore(config, mockModel);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('hybridScore', () => {
    it('should return heuristic when score is too low', async () => {
      const { hybridScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const invalidView = vi.fn(() => false);
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = await hybridScore(config, invalidView, null);
      expect(score).toBe(0.1); // Low score from invalid view
    });

    it('should combine heuristic and ML scores', async () => {
      const { hybridScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const mockModel = {
        activate: vi.fn(() => [0.8]),
      };
      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };
      const score = await hybridScore(config, isValidInterestingView, mockModel);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('generateCandidates', () => {
    it('should generate candidate configurations', async () => {
      const { generateCandidates } = await import('../../static/js/discovery/discovery-algorithm.js');
      const candidates = await generateCandidates('mandelbrot', { count: 10 });
      expect(candidates).toBeInstanceOf(Array);
      expect(candidates).toHaveLength(10);
      candidates.forEach((candidate) => {
        expect(candidate).toHaveProperty('fractalType', 'mandelbrot');
        expect(candidate).toHaveProperty('zoom');
        expect(candidate).toHaveProperty('offsetX');
        expect(candidate).toHaveProperty('offsetY');
        expect(candidate).toHaveProperty('iterations');
        expect(candidate).toHaveProperty('colorScheme');
      });
    });

    it('should respect count option', async () => {
      const { generateCandidates } = await import('../../static/js/discovery/discovery-algorithm.js');
      const candidates = await generateCandidates('julia', { count: 5 });
      expect(candidates).toHaveLength(5);
    });

    it('should include color scheme when specified', async () => {
      const { generateCandidates } = await import('../../static/js/discovery/discovery-algorithm.js');
      const candidates = await generateCandidates('mandelbrot', {
        count: 5,
        colorScheme: 'fire',
        includeColorScheme: true,
      });
      candidates.forEach((candidate) => {
        expect(candidate.colorScheme).toBe('fire');
      });
    });

    it('should generate random Julia C parameters for Julia set fractals', async () => {
      const { generateCandidates } = await import('../../static/js/discovery/discovery-algorithm.js');
      const juliaTypes = ['julia', 'julia-snakes', 'multibrot-julia', 'burning-ship-julia', 'tricorn-julia', 'phoenix-julia', 'lambda-julia', 'hybrid-julia', 'magnet'];

      for (const juliaType of juliaTypes) {
        const candidates = await generateCandidates(juliaType, { count: 10 });
        expect(candidates.length).toBeGreaterThan(0);

        // Check that Julia C parameters are in the valid range (-2 to 2) and not all zeros
        const juliaCValues = candidates.map(c => ({ x: c.juliaCX, y: c.juliaCY }));
        const hasNonZeroValues = juliaCValues.some(c => c.x !== 0 || c.y !== 0);

        expect(hasNonZeroValues).toBe(true); // At least some should be non-zero
        juliaCValues.forEach(c => {
          expect(c.x).toBeGreaterThanOrEqual(-2);
          expect(c.x).toBeLessThanOrEqual(2);
          expect(c.y).toBeGreaterThanOrEqual(-2);
          expect(c.y).toBeLessThanOrEqual(2);
        });
      }
    });

    it('should use zero Julia C parameters for non-Julia fractals', async () => {
      const { generateCandidates } = await import('../../static/js/discovery/discovery-algorithm.js');
      const candidates = await generateCandidates('mandelbrot', { count: 5 });
      candidates.forEach((candidate) => {
        expect(candidate.juliaCX).toBe(0);
        expect(candidate.juliaCY).toBe(0);
      });
    });
  });

  describe('discoverInterestingFractals', () => {
    it('should discover interesting fractals', async () => {
      const { discoverInterestingFractals } = await import('../../static/js/discovery/discovery-algorithm.js');
      const discoveries = await discoverInterestingFractals(
        'mandelbrot',
        isValidInterestingView,
        null,
        { candidateCount: 20, topK: 5, minScore: 0.3 }
      );
      expect(discoveries).toBeInstanceOf(Array);
      expect(discoveries.length).toBeLessThanOrEqual(5);
      discoveries.forEach((discovery) => {
        expect(discovery).toHaveProperty('score');
        expect(discovery.score).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should sort discoveries by score', async () => {
      const { discoverInterestingFractals } = await import('../../static/js/discovery/discovery-algorithm.js');
      const discoveries = await discoverInterestingFractals(
        'mandelbrot',
        isValidInterestingView,
        null,
        { candidateCount: 10, topK: 3, minScore: 0.3 }
      );
      if (discoveries.length > 1) {
        for (let i = 0; i < discoveries.length - 1; i++) {
          expect(discoveries[i].score).toBeGreaterThanOrEqual(discoveries[i + 1].score);
        }
      }
    });
  });
});






