/**
 * logger.js
 * @module logger
 * @description Centralised, structured logging service for ElectionIQ.
 * Provides environment-aware logging levels (DEBUG, INFO, WARN, ERROR)
 * with consistent module tagging. All modules use this logger exclusively —
 * direct console calls are prohibited elsewhere in the codebase.
 *
 * Log level can be overridden at runtime via:
 *   localStorage.setItem("LOG_LEVEL", "DEBUG");
 *
 * Built to produce structured output compatible with Google Cloud Logging
 * where stdout/stderr streams are aggregated and searchable by severity.
 */

// ---------------------------------------------------------------------------
// Log Level Constants
// ---------------------------------------------------------------------------

/**
 * Numeric log level map. Higher values = higher severity.
 * @constant {{ DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, NONE: 5 }}
 */
const LEVELS = {
  DEBUG: 1,
  INFO:  2,
  WARN:  3,
  ERROR: 4,
  NONE:  5,
};

/** @type {number} Active log level — defaults to INFO */
let _currentLevel = LEVELS.INFO;

// Try to load override from localStorage safely (fails silently in incognito)
try {
  if (typeof window !== "undefined" && window.localStorage?.getItem("LOG_LEVEL")) {
    const override = window.localStorage.getItem("LOG_LEVEL").toUpperCase();
    if (LEVELS[override] !== undefined) {_currentLevel = LEVELS[override];}
  }
} catch (_e) {
  // Ignore localStorage access errors (incognito mode, permissions)
}

// ---------------------------------------------------------------------------
// Internal Formatter
// ---------------------------------------------------------------------------

/**
 * Format a log line with a consistent `[ElectionIQ:module]` tag prefix.
 *
 * @param {string} module - The emitting module name (e.g. "ai", "proactive")
 * @param {string} msg    - The primary log message
 * @returns {string} Formatted prefix string for console output
 * @private
 */
function _formatMessage(module, msg) {
  return `[ElectionIQ:${module.padEnd(10)}] ${msg}`;
}

// ---------------------------------------------------------------------------
// Public Logger API
// ---------------------------------------------------------------------------

/**
 * Centralised logger object. Import and use in every module.
 * @namespace logger
 */
export const logger = {
  /**
   * Log fine-grained debug info. Muted by default — set LOG_LEVEL=DEBUG to activate.
   * @param {string} module - Emitting module name
   * @param {string} msg    - Debug message
   * @param {...any} args   - Additional context values
   */
  debug: (module, msg, ...args) => {
    if (_currentLevel <= LEVELS.DEBUG) {
      console.debug(_formatMessage(module, msg), ...args);
    }
  },

  /**
   * Log application lifecycle events (startup, service init, state changes).
   * @param {string} module - Emitting module name
   * @param {string} msg    - Info message
   * @param {...any} args   - Additional context values
   */
  info: (module, msg, ...args) => {
    if (_currentLevel <= LEVELS.INFO) {
      console.info(_formatMessage(module, msg), ...args);
    }
  },

  /**
   * Log degraded states or recoverable errors (API unavailable, cache miss).
   * Application continues operating — these are non-fatal.
   * @param {string} module - Emitting module name
   * @param {string} msg    - Warning message
   * @param {...any} args   - Additional context values
   */
  warn: (module, msg, ...args) => {
    if (_currentLevel <= LEVELS.WARN) {
      console.warn(_formatMessage(module, msg), ...args);
    }
  },

  /**
   * Log critical failures that disrupt a user-facing pipeline stage.
   * @param {string} module - Emitting module name
   * @param {string} msg    - Error message
   * @param {...any} args   - Additional context values
   */
  error: (module, msg, ...args) => {
    if (_currentLevel <= LEVELS.ERROR) {
      console.error(_formatMessage(module, msg), ...args);
    }
  },

  /**
   * Dynamically reconfigure the active log level at runtime.
   * @param {"DEBUG"|"INFO"|"WARN"|"ERROR"|"NONE"} level - New log level string
   * @returns {void}
   */
  setLevel: (level) => {
    if (LEVELS[level] !== undefined) {_currentLevel = LEVELS[level];}
  },
};
