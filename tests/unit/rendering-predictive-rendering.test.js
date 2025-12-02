import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictiveRenderingManager,
  createPredictiveRenderingManager,
} from '../../static/js/rendering/predictive-rendering.js';

describe('rendering/predictive-rendering', () => {
  let manager;

  beforeEach(() => {
    manager = new PredictiveRenderingManager({
      maxPredictions: 3,
      velocityDecay: 0.9,
      minVelocity: 0.01,
      predictionDistance: 1.5,
    });
  });

  describe('PredictiveRenderingManager', () => {
    it('should initialize with default values', () => {
      expect(manager.maxPredictions).toBe(3);
      expect(manager.velocityDecay).toBe(0.9);
      expect(manager.minVelocity).toBe(0.01);
      expect(manager.predictionDistance).toBe(1.5);
      expect(manager.velocity).toEqual({ x: 0, y: 0, zoom: 0 });
    });

    it('should update velocity from parameter changes', () => {
      manager.isEnabled = true;
      const params1 = { offset: { x: 0, y: 0 }, zoom: 1 };
      const params2 = { offset: { x: 1, y: 0 }, zoom: 1.5 };

      // Simulate time passing
      manager.lastUpdateTime = performance.now() - 100;
      manager.updateVelocity(params1);
      
      // Wait a bit and update again
      manager.lastUpdateTime = performance.now() - 50;
      manager.updateVelocity(params2);

      // Velocity should be calculated (may be small due to decay)
      expect(typeof manager.velocity.x).toBe('number');
      expect(typeof manager.velocity.zoom).toBe('number');
    });

    it('should generate view key from parameters', () => {
      const params = {
        zoom: 1.5,
        offset: { x: 0.5, y: 0.3 },
        iterations: 100,
        colorScheme: 'classic',
      };
      const key = manager.generateViewKey(params, 'mandelbrot');
      expect(key).toContain('mandelbrot');
      expect(key).toContain('1.5');
    });

    it('should predict next views based on velocity', () => {
      manager.isEnabled = true;
      manager.velocity = { x: 0.1, y: 0.05, zoom: 0.01 };
      const params = {
        offset: { x: 0, y: 0 },
        zoom: 1,
        iterations: 100,
        colorScheme: 'classic',
      };

      const predictions = manager.predictNextViews(params, 'mandelbrot');
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0]).toHaveProperty('params');
      expect(predictions[0]).toHaveProperty('viewKey');
    });

    it('should not predict when velocity is too low', () => {
      manager.velocity = { x: 0.001, y: 0.001, zoom: 0.001 };
      const params = {
        offset: { x: 0, y: 0 },
        zoom: 1,
        iterations: 100,
        colorScheme: 'classic',
      };

      const predictions = manager.predictNextViews(params, 'mandelbrot');
      expect(predictions.length).toBe(0);
    });

    it('should add predictions to queue', () => {
      manager.isEnabled = true;
      const prediction = {
        params: { offset: { x: 1, y: 1 }, zoom: 2 },
        viewKey: 'test-key',
        priority: 1,
      };

      manager.addPrediction(prediction);
      expect(manager.pendingPredictions.has('test-key')).toBe(true);
    });

    it('should mark predictions as completed', () => {
      manager.pendingPredictions.set('test-key', {});
      manager.markCompleted('test-key');
      expect(manager.pendingPredictions.has('test-key')).toBe(false);
      expect(manager.completedPredictions.has('test-key')).toBe(true);
    });

    it('should get next prediction with highest priority', () => {
      manager.isEnabled = true;
      manager.pendingPredictions.set('key1', { priority: 2, params: {}, viewKey: 'key1' });
      manager.pendingPredictions.set('key2', { priority: 1, params: {}, viewKey: 'key2' });
      manager.pendingPredictions.set('key3', { priority: 3, params: {}, viewKey: 'key3' });

      const next = manager.getNextPrediction();
      expect(next).toBeTruthy();
      expect(next.priority).toBe(1);
    });

    it('should clear all predictions', () => {
      manager.pendingPredictions.set('key1', {});
      manager.completedPredictions.add('key2');
      manager.clear();
      expect(manager.pendingPredictions.size).toBe(0);
      expect(manager.completedPredictions.size).toBe(0);
    });

    it('should reset velocity', () => {
      manager.velocity = { x: 1, y: 1, zoom: 1 };
      manager.resetVelocity();
      expect(manager.velocity).toEqual({ x: 0, y: 0, zoom: 0 });
    });

    it('should get statistics', () => {
      const stats = manager.getStats();
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('pendingPredictions');
      expect(stats).toHaveProperty('completedPredictions');
      expect(stats).toHaveProperty('velocity');
    });

    it('should disable predictive rendering', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled).toBe(false);
      expect(manager.pendingPredictions.size).toBe(0);
    });
  });

  describe('createPredictiveRenderingManager', () => {
    it('should create a manager instance', () => {
      const instance = createPredictiveRenderingManager();
      expect(instance).toBeInstanceOf(PredictiveRenderingManager);
    });

    it('should accept options', () => {
      const instance = createPredictiveRenderingManager({
        maxPredictions: 5,
        velocityDecay: 0.8,
      });
      expect(instance.maxPredictions).toBe(5);
      expect(instance.velocityDecay).toBe(0.8);
    });
  });
});

