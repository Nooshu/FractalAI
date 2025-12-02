import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWebCodecsAvailable,
  isMediaRecorderAvailable,
  WebCodecsVideoEncoder,
  recordFractalVideo,
  downloadVideo,
} from '../../static/js/export/video-encoder.js';

describe('export/video-encoder', () => {
  describe('isWebCodecsAvailable', () => {
    it('should check for WebCodecs API', () => {
      const result = isWebCodecsAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isMediaRecorderAvailable', () => {
    it('should check for MediaRecorder API', () => {
      // Mock MediaRecorder for Node.js environment
      if (typeof globalThis.MediaRecorder === 'undefined') {
        globalThis.MediaRecorder = class MediaRecorder {
          static isTypeSupported() {
            return false;
          }
        };
      }
      const result = isMediaRecorderAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('WebCodecsVideoEncoder', () => {
    let encoder;

    beforeEach(() => {
      encoder = new WebCodecsVideoEncoder({
        width: 800,
        height: 600,
        fps: 60,
        codec: 'avc1.42001E',
        bitrate: 5000000,
      });
    });

    it('should initialize with options', () => {
      expect(encoder.width).toBe(800);
      expect(encoder.height).toBe(600);
      expect(encoder.fps).toBe(60);
      expect(encoder.codec).toBe('avc1.42001E');
      expect(encoder.bitrate).toBe(5000000);
    });

    it('should use default values when options not provided', () => {
      const defaultEncoder = new WebCodecsVideoEncoder();
      expect(defaultEncoder.width).toBe(1920);
      expect(defaultEncoder.height).toBe(1080);
      expect(defaultEncoder.fps).toBe(60);
    });

    it('should check if WebCodecs is available', () => {
      const available = WebCodecsVideoEncoder.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should set progress callback', () => {
      const callback = vi.fn();
      encoder.setProgressCallback(callback);
      expect(encoder.onProgress).toBe(callback);
    });

    it('should set complete callback', () => {
      const callback = vi.fn();
      encoder.setCompleteCallback(callback);
      expect(encoder.onComplete).toBe(callback);
    });

    it('should set error callback', () => {
      const callback = vi.fn();
      encoder.setErrorCallback(callback);
      expect(encoder.onError).toBe(callback);
    });

    it('should cancel encoding', () => {
      encoder.isEncoding = true;
      encoder.chunks = [1, 2, 3];
      encoder.frameCount = 10;
      encoder.cancel();
      expect(encoder.isEncoding).toBe(false);
      expect(encoder.chunks.length).toBe(0);
      expect(encoder.frameCount).toBe(0);
    });
  });

  describe('downloadVideo', () => {
    it('should create download link', () => {
      const blob = new Blob(['test'], { type: 'video/webm' });
      const createElement = vi.spyOn(document, 'createElement');
      const appendChild = vi.spyOn(document.body, 'appendChild');
      const removeChild = vi.spyOn(document.body, 'removeChild');

      downloadVideo(blob, 'test-video.webm');

      expect(createElement).toHaveBeenCalledWith('a');
      expect(appendChild).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalled();
    });
  });
});

