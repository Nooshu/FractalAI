/**
 * Fractal Discovery Algorithm
 * Uses heuristics for fast initial screening and TensorFlow.js for ML-based scoring
 */

// Lazy load TensorFlow.js
let tf = null;
async function getTensorFlow() {
  if (!tf) {
    try {
      // Dynamic import - Vite will bundle it but load it on demand
      const tfModule = await import('@tensorflow/tfjs');
      // TensorFlow.js exports everything as named exports
      tf = tfModule;
      return tf;
    } catch (error) {
      console.error('Failed to load TensorFlow.js:', error);
      return null;
    }
  }
  return tf;
}

/**
 * Extract features from a fractal configuration for ML scoring
 * @param {Object} config - Fractal configuration
 * @returns {Array<number>} Feature vector
 */
export function extractFeatures(config) {
  const {
    fractalType,
    zoom,
    offsetX,
    offsetY,
    iterations,
    colorScheme: _colorScheme,
    xScale = 1.0,
    yScale = 1.0,
    juliaCX = 0,
    juliaCY = 0,
  } = config;

  // Encode fractal type as a number (simple hash)
  const typeHash = fractalType
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Normalize features
  const features = [
    typeHash / 10000, // Normalized type hash
    Math.log10(zoom + 1) / 10, // Log-scaled zoom
    offsetX / 4, // Normalized offset X (-2 to 2 range)
    offsetY / 4, // Normalized offset Y
    iterations / 400, // Normalized iterations
    xScale / 3, // Normalized x scale
    yScale / 3, // Normalized y scale
    juliaCX / 2, // Normalized Julia C real
    juliaCY / 2, // Normalized Julia C imag
    // Distance from origin
    Math.sqrt(offsetX * offsetX + offsetY * offsetY) / 4,
    // Zoom level category (low, medium, high)
    zoom < 1 ? 0 : zoom < 10 ? 0.5 : 1,
  ];

  return features;
}

/**
 * Heuristic scoring for fast initial screening
 * @param {Object} config - Fractal configuration
 * @param {Function} isValidInterestingView - Validation function
 * @returns {number} Heuristic score (0-1)
 */
export function heuristicScore(config, isValidInterestingView) {
  let score = 0.5; // Base score

  // Check if view is interesting using existing validation
  if (isValidInterestingView) {
    const isValid = isValidInterestingView(
      { x: config.offsetX, y: config.offsetY },
      config.zoom,
      config.fractalType
    );
    if (!isValid) {
      return 0.1; // Low score for uninteresting views
    }
    score += 0.2;
  }

  // Prefer moderate zoom levels (not too close, not too far)
  const zoomScore = 1 - Math.abs(Math.log10(config.zoom + 1) - 1) / 2;
  score += zoomScore * 0.15;

  // Prefer views near interesting areas (for Mandelbrot-like fractals)
  const distFromOrigin = Math.sqrt(
    config.offsetX * config.offsetX + config.offsetY * config.offsetY
  );
  if (distFromOrigin < 2.5) {
    score += 0.1; // Bonus for being near origin
  }

  // Prefer moderate iteration counts
  const iterScore = 1 - Math.abs(config.iterations - 125) / 125;
  score += iterScore * 0.05;

  return Math.min(1, Math.max(0, score));
}

/**
 * ML-based scoring using TensorFlow.js
 * @param {Object} config - Fractal configuration
 * @param {Object} model - Trained TensorFlow model
 * @returns {Promise<number>} ML score (0-1)
 */
export async function mlScore(config, model) {
  if (!model) {
    // Fallback to heuristic if no model
    return heuristicScore(config, null);
  }

  try {
    const tf = await getTensorFlow();
    if (!tf) {
      return heuristicScore(config, null);
    }
    const features = extractFeatures(config);
    const input = tf.tensor2d([features]);
    const prediction = model.predict(input);
    const score = await prediction.data();
    const scoreValue = Math.min(1, Math.max(0, score[0]));
    input.dispose();
    prediction.dispose();
    return scoreValue;
  } catch (error) {
    console.error('ML scoring error:', error);
    return heuristicScore(config, null);
  }
}

/**
 * Hybrid scoring: combines heuristics and ML
 * @param {Object} config - Fractal configuration
 * @param {Function} isValidInterestingView - Validation function
 * @param {Object} model - Trained TensorFlow model
 * @returns {Promise<number>} Combined score (0-1)
 */
export async function hybridScore(config, isValidInterestingView, model) {
  // Fast heuristic screening first
  const heuristic = heuristicScore(config, isValidInterestingView);

  // If heuristic score is too low, skip ML evaluation
  if (heuristic < 0.3) {
    return heuristic;
  }

  // Use ML for refinement if model is available
  let ml = heuristic;
  if (model) {
    ml = await mlScore(config, model);
  }

  // Weighted combination: 30% heuristic, 70% ML (if available)
  const mlWeight = model ? 0.7 : 0;
  const heuristicWeight = 1 - mlWeight;

  return heuristicWeight * heuristic + mlWeight * ml;
}

/**
 * Get available color schemes
 * @returns {Promise<Array<string>>} Array of color scheme names
 */
async function getAvailableColorSchemes() {
  try {
    // Dynamically import CONFIG to avoid circular dependencies
    const { CONFIG } = await import('../core/config.js');
    return CONFIG.colors.schemes || ['classic'];
  } catch (_error) {
    // Fallback list if import fails
    return [
      'classic',
      'fire',
      'ocean',
      'rainbow',
      'rainbow-pastel',
      'rainbow-dark',
      'rainbow-vibrant',
      'rainbow-double',
      'rainbow-shifted',
      'monochrome',
      'forest',
      'sunset',
      'purple',
      'cyan',
      'gold',
      'ice',
      'neon',
      'cosmic',
      'aurora',
      'coral',
      'autumn',
      'midnight',
      'emerald',
      'rosegold',
      'electric',
      'vintage',
      'tropical',
      'galaxy',
      'lava',
      'arctic',
      'sakura',
      'volcanic',
      'mint',
      'sunrise',
      'steel',
      'prism',
      'mystic',
      'amber',
    ];
  }
}

/**
 * Generate candidate configurations for discovery
 * @param {string} fractalType - Type of fractal
 * @param {Object} options - Generation options
 * @returns {Promise<Array<Object>>} Array of candidate configurations
 */
export async function generateCandidates(fractalType, options = {}) {
  const {
    count = 100,
    zoomRange = [0.5, 100],
    offsetRange = [-2, 2],
    iterations = 125,
    colorScheme = null, // null means random selection
    includeColorScheme = true, // Whether to vary color schemes
  } = options;

  const candidates = [];
  const availableSchemes = await getAvailableColorSchemes();

  for (let i = 0; i < count; i++) {
    const zoom =
      zoomRange[0] +
      Math.random() * (zoomRange[1] - zoomRange[0]);
    const offsetX =
      offsetRange[0] + Math.random() * (offsetRange[1] - offsetRange[0]);
    const offsetY =
      offsetRange[0] + Math.random() * (offsetRange[1] - offsetRange[0]);
    
    // Randomly select color scheme if not specified or if includeColorScheme is true
    const selectedColorScheme = includeColorScheme && colorScheme === null
      ? availableSchemes[Math.floor(Math.random() * availableSchemes.length)]
      : (colorScheme || 'classic');

    candidates.push({
      fractalType,
      zoom,
      offsetX,
      offsetY,
      iterations,
      colorScheme: selectedColorScheme,
      xScale: 1.0,
      yScale: 1.0,
      juliaCX: 0,
      juliaCY: 0,
    });
  }

  return candidates;
}

/**
 * Discover interesting fractal configurations
 * @param {string} fractalType - Type of fractal
 * @param {Function} isValidInterestingView - Validation function
 * @param {Object} model - Trained TensorFlow model
 * @param {Object} options - Discovery options
 * @returns {Promise<Array<Object>>} Array of discovered configurations sorted by score
 */
export async function discoverInterestingFractals(
  fractalType,
  isValidInterestingView,
  model,
  options = {}
) {
  const {
    candidateCount = 100,
    topK = 10,
    minScore = 0.5,
  } = options;

  // Generate candidates
  const candidates = await generateCandidates(fractalType, {
    count: candidateCount,
    ...options,
  });

  // Score all candidates
  const scored = await Promise.all(
    candidates.map(async (config) => {
      const score = await hybridScore(config, isValidInterestingView, model);
      return { ...config, score };
    })
  );

  // Filter by minimum score and sort by score
  const filtered = scored
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return filtered;
}

