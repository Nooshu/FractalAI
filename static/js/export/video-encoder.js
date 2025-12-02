/**
 * Video Encoder
 * Provides hardware-accelerated video encoding for fractal animation export
 * Uses WebCodecs API when available, falls back to MediaRecorder API
 */

/**
 * Check if WebCodecs API is available
 * @returns {boolean} True if available
 */
export function isWebCodecsAvailable() {
  return typeof globalThis.VideoEncoder !== 'undefined' && typeof globalThis.VideoFrame !== 'undefined';
}

/**
 * Check if MediaRecorder API is available
 * @returns {boolean} True if available
 */
export function isMediaRecorderAvailable() {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9') || MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}

/**
 * Video Encoder using WebCodecs API (when available)
 * Encodes canvas frames into a video file
 * Note: WebCodecs produces raw encoded chunks that need muxing for a complete MP4 file
 */
export class WebCodecsVideoEncoder {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.width - Video width
   * @param {number} options.height - Video height
   * @param {number} options.fps - Frames per second (default: 60)
   * @param {string} options.codec - Video codec (default: 'avc1.42001E' for H.264)
   * @param {number} options.bitrate - Bitrate in bits per second (default: 5000000)
   */
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 60;
    this.codec = options.codec || 'avc1.42001E'; // H.264 baseline profile
    this.bitrate = options.bitrate || 5000000; // 5 Mbps
    this.encoder = null;
    this.chunks = [];
    this.isEncoding = false;
    this.frameCount = 0;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * Check if WebCodecs API is available
   * @returns {boolean} True if available
   */
  static isAvailable() {
    return isWebCodecsAvailable();
  }

  /**
   * Check if a video codec configuration is supported
   * @param {Object} config - Video encoder configuration
   * @returns {Object} Support information
   */
  static isConfigSupported(config) {
    if (typeof globalThis.VideoEncoder === 'undefined') {
      return { supported: false };
    }
    return globalThis.VideoEncoder.isConfigSupported(config);
  }

  /**
   * Initialize the video encoder
   * @returns {Promise<void>} Promise that resolves when encoder is ready
   */
  async initialize() {
    if (!VideoEncoder.isAvailable()) {
      throw new Error('WebCodecs API is not available in this browser');
    }

    return new Promise((resolve, reject) => {
      try {
        this.encoder = new globalThis.VideoEncoder({
          output: (chunk) => {
            this.chunks.push(chunk);
          },
          error: (error) => {
            console.error('[VideoEncoder] Encoding error:', error);
            this.isEncoding = false;
            if (this.onError) {
              this.onError(error);
            }
          },
        });

        const config = {
          codec: this.codec,
          width: this.width,
          height: this.height,
          bitrate: this.bitrate,
          framerate: this.fps,
        };

        const support = VideoEncoder.isConfigSupported(config);
        if (!support.supported) {
          throw new Error(`Video codec ${this.codec} is not supported: ${JSON.stringify(support)}`);
        }

        this.encoder.configure(config);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Encode a frame from canvas
   * @param {HTMLCanvasElement} canvas - Canvas element to encode
   * @param {number} timestamp - Frame timestamp in microseconds
   * @returns {Promise<void>} Promise that resolves when frame is encoded
   */
  async encodeFrame(canvas, timestamp) {
    if (!this.encoder || !this.isEncoding) {
      return;
    }

    try {
      // Create VideoFrame from canvas
      const frame = new globalThis.VideoFrame(canvas, {
        timestamp: timestamp,
        duration: 1000000 / this.fps, // Duration in microseconds
      });

      // Encode the frame
      this.encoder.encode(frame);
      frame.close(); // Clean up frame

      this.frameCount++;

      // Report progress
      if (this.onProgress) {
        this.onProgress(this.frameCount);
      }
    } catch (error) {
      console.error('[VideoEncoder] Frame encoding error:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Start encoding
   */
  start() {
    if (!this.encoder) {
      throw new Error('Encoder not initialized. Call initialize() first.');
    }

    this.isEncoding = true;
    this.chunks = [];
    this.frameCount = 0;
  }

  /**
   * Flush encoder and finalize video
   * @returns {Promise<Blob>} Promise that resolves to video blob
   */
  async flush() {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('Encoder not active');
    }

    return new Promise((resolve, reject) => {
      try {
        // Flush encoder to ensure all frames are processed
        this.encoder.flush().then(() => {
          this.isEncoding = false;

          // WebCodecs produces EncodedVideoChunk objects
          // For a complete MP4 file, we would need a muxer library (e.g., mp4box.js)
          // For now, we'll create a blob from the chunks
          // Note: This creates a raw H.264 stream, not a complete MP4 file
          
          // Convert chunks to ArrayBuffer for blob creation
          const chunkData = [];
          for (const chunk of this.chunks) {
            try {
              const buffer = new ArrayBuffer(chunk.byteLength);
              const view = new Uint8Array(buffer);
              chunk.copyTo(view);
              chunkData.push(buffer);
            } catch (error) {
              console.warn('[VideoEncoder] Failed to copy chunk:', error);
            }
          }

          // Create blob from chunk data
          // Note: This is raw H.264 data, not a complete MP4
          // For a working MP4, you would need to mux these chunks with a library
          // For now, return as raw H.264 stream (may not be playable in all players)
          const blob = new Blob(chunkData, { type: 'video/mp4' });

          // Clean up encoder
          this.encoder.close();
          this.encoder = null;

          if (this.onComplete) {
            this.onComplete(blob, this.frameCount);
          }

          resolve(blob);
        }).catch((error) => {
          this.isEncoding = false;
          reject(error);
        });
      } catch (error) {
        this.isEncoding = false;
        reject(error);
      }
    });
  }

  /**
   * Cancel encoding
   */
  cancel() {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    this.isEncoding = false;
    this.chunks = [];
    this.frameCount = 0;
  }

  /**
   * Set progress callback
   * @param {Function} callback - Callback function(frameCount)
   */
  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Callback function(blob, frameCount)
   */
  setCompleteCallback(callback) {
    this.onComplete = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback function(error)
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }
}

/**
 * Record fractal animation as video
 * Uses WebCodecs API when available for hardware-accelerated encoding
 * Falls back to MediaRecorder API for broader browser support
 * @param {HTMLCanvasElement} canvas - Canvas element to record
 * @param {Object} options - Recording options
 * @param {number} options.duration - Recording duration in seconds (default: 5)
 * @param {number} options.fps - Frames per second (default: 60)
 * @param {Function} options.onFrame - Callback to render each frame (canvas, frameNumber) => void
 * @param {Function} options.onProgress - Progress callback (frameCount, totalFrames) => void
 * @param {boolean} options.useWebCodecs - Force use of WebCodecs API (default: auto-detect)
 * @returns {Promise<Blob>} Promise that resolves to video blob
 */
export async function recordFractalVideo(canvas, options = {}) {
  const duration = options.duration || 5;
  const fps = options.fps || 60;
  const totalFrames = Math.floor(duration * fps);
  const frameDuration = 1000 / fps; // Duration in milliseconds

  // Try WebCodecs first if available and requested
  const useWebCodecs = options.useWebCodecs !== false && isWebCodecsAvailable();
  
  if (useWebCodecs) {
    try {
      return await recordWithWebCodecs(canvas, duration, fps, totalFrames, frameDuration, options);
    } catch (error) {
      console.warn('[VideoEncoder] WebCodecs encoding failed, falling back to MediaRecorder:', error);
      // Fall through to MediaRecorder
    }
  }

  // Fallback to MediaRecorder (broader browser support, produces playable files)
  if (!isMediaRecorderAvailable()) {
    throw new Error('Video recording is not available. Requires MediaRecorder API support (Chrome 47+, Firefox 25+, Safari 14.1+, Edge 79+).');
  }

  return await recordWithMediaRecorder(canvas, duration, fps, totalFrames, frameDuration, options);
}

/**
 * Record video using WebCodecs API
 * @private
 */
async function recordWithWebCodecs(canvas, duration, fps, totalFrames, frameDuration, options) {
  // Create encoder
  const encoder = new WebCodecsVideoEncoder({
    width: canvas.width,
    height: canvas.height,
    fps: fps,
  });

  // Set up callbacks
  if (options.onProgress) {
    encoder.setProgressCallback((frameCount) => {
      options.onProgress(frameCount, totalFrames);
    });
  }

  // Initialize encoder
  await encoder.initialize();

  // Start encoding
  encoder.start();

  // Record frames
  for (let frame = 0; frame < totalFrames; frame++) {
    // Render frame using callback
    if (options.onFrame) {
      await options.onFrame(canvas, frame);
    }

    // Wait for frame to render
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Encode frame
    const timestamp = frame * (1000000 / fps); // Timestamp in microseconds
    await encoder.encodeFrame(canvas, timestamp);

    // Wait for next frame time
    await new Promise((resolve) => setTimeout(resolve, frameDuration));
  }

  // Flush and finalize
  const blob = await encoder.flush();
  return blob;
}

/**
 * Record video using MediaRecorder API
 * @private
 */
async function recordWithMediaRecorder(canvas, duration, fps, totalFrames, frameDuration, options) {
  // Determine best codec
  let codec = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(codec)) {
    codec = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(codec)) {
      codec = 'video/webm';
    }
  }

  // Create MediaRecorder
  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: codec,
    videoBitsPerSecond: 5000000, // 5 Mbps
  });

  const chunks = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: codec });
      resolve(blob);
    };

    mediaRecorder.onerror = (event) => {
      reject(new Error('MediaRecorder error: ' + event.error));
    };

    // Start recording
    mediaRecorder.start();

    // Record frames
    let frameCount = 0;
    const recordFrame = async () => {
      if (frameCount >= totalFrames) {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Render frame using callback
      if (options.onFrame) {
        await options.onFrame(canvas, frameCount);
      }

      // Wait for frame to render
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Report progress
      if (options.onProgress) {
        options.onProgress(frameCount + 1, totalFrames);
      }

      frameCount++;

      // Schedule next frame
      setTimeout(recordFrame, frameDuration);
    };

    // Start recording frames
    recordFrame();
  });
}

/**
 * Download video blob
 * @param {Blob} blob - Video blob
 * @param {string} filename - Filename for download
 */
export function downloadVideo(blob, filename = 'fractal-video.webm') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

