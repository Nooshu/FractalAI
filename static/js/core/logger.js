/**
 * Logger Utility
 * Provides development-only logging functions
 * Logs are only shown in development/local environments, not in production
 */

/**
 * Check if we're in a development/local environment
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  // Check if running on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return true;
    }
    
    // Check for development flag in URL
    if (window.location.search.includes('dev=true')) {
      return true;
    }
  }
  
  // Check for NODE_ENV in build (Vite sets this)
  if (import.meta.env?.DEV) {
    return true;
  }
  
  return false;
}

/**
 * Development-only logger
 * Only logs if in development mode
 */
export const devLog = {
  /**
   * Log a message (console.log)
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (isDevelopment()) {
      console.log(...args);
    }
  },
  
  /**
   * Debug message (console.debug)
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (isDevelopment()) {
      console.debug(...args);
    }
  },
  
  /**
   * Info message (console.info)
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (isDevelopment()) {
      console.info(...args);
    }
  },
  
  /**
   * Warning message (console.warn)
   * Warnings are shown in both dev and production
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    // Warnings are always shown
    console.warn(...args);
  },
  
  /**
   * Error message (console.error)
   * Errors are always shown in both dev and production
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    // Errors are always shown
    console.error(...args);
  },
};

