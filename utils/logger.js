/**
 * @fileoverview Centralized logging utility with configurable levels.
 * Prefixes every log line with timestamp, module name, and level.
 * @module utils/logger
 */

/** @enum {number} Log severity levels */
const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
});

/**
 * Logger instance scoped to a module.
 */
class Logger {
  /** @type {string} */
  #prefix;
  /** @type {number} */
  #level;

  /**
   * @param {string} prefix - Module name shown in log output
   * @param {number} [level=LOG_LEVELS.INFO] - Minimum severity to print
   */
  constructor(prefix, level = LOG_LEVELS.INFO) {
    this.#prefix = prefix;
    this.#level = level;
  }

  /**
   * Internal log dispatcher.
   * @param {number} level - Severity level
   * @param {string} levelName - Human-readable level tag
   * @param {...*} args - Data to log
   */
  #log(level, levelName, ...args) {
    if (level < this.#level) return;
    const ts = new Date().toISOString().slice(11, 23);
    const tag = `[${ts}][${this.#prefix}][${levelName}]`;
    switch (level) {
      case LOG_LEVELS.ERROR: console.error(tag, ...args); break;
      case LOG_LEVELS.WARN:  console.warn(tag, ...args);  break;
      case LOG_LEVELS.INFO:  console.info(tag, ...args);  break;
      default:               console.debug(tag, ...args);
    }
  }

  /** @param {...*} args */
  debug(...args) { this.#log(LOG_LEVELS.DEBUG, 'DEBUG', ...args); }
  /** @param {...*} args */
  info(...args)  { this.#log(LOG_LEVELS.INFO, 'INFO', ...args); }
  /** @param {...*} args */
  warn(...args)  { this.#log(LOG_LEVELS.WARN, 'WARN', ...args); }
  /** @param {...*} args */
  error(...args) { this.#log(LOG_LEVELS.ERROR, 'ERROR', ...args); }
}

/**
 * Create a namespaced logger for a given module.
 *
 * @param {string} moduleName - Short name for the module (e.g. 'SW', 'popup', 'jiggler')
 * @returns {Logger} A configured Logger instance
 *
 * @example
 * import { createLogger } from '../utils/logger.js';
 * const log = createLogger('popup');
 * log.info('Popup opened');
 */
export function createLogger(moduleName) {
  return new Logger(moduleName);
}

export { LOG_LEVELS };
