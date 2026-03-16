/**
 * @fileoverview Custom error types and error handling helpers.
 * @module utils/errors
 */

/** @enum {string} Error codes used throughout the extension */
export const ErrorCodes = Object.freeze({
  STORAGE_FULL: 'STORAGE_FULL',
  INJECTION_FAILED: 'INJECTION_FAILED',
  TAB_NOT_FOUND: 'TAB_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_STATE: 'INVALID_STATE',
  SCHEDULE_ERROR: 'SCHEDULE_ERROR',
  CHROME_API_ERROR: 'CHROME_API_ERROR',
  UNEXPECTED: 'UNEXPECTED',
});

/**
 * Typed extension error with a machine-readable code.
 */
export class DriftError extends Error {
  /**
   * @param {string} message - Human-readable description
   * @param {string} code - One of {@link ErrorCodes}
   * @param {Object} [details={}] - Extra context for debugging
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DriftError';
    /** @type {string} */
    this.code = code;
    /** @type {Object} */
    this.details = details;
  }
}

/**
 * Wrap an async function with try/catch, logging failures.
 *
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Label for log messages
 * @returns {Function} Wrapped function that never throws (logs instead)
 *
 * @example
 * const safeToggle = withErrorBoundary(toggle, 'toggle');
 * await safeToggle();
 */
export function withErrorBoundary(fn, context = 'unknown') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[DriftError][${context}]`, error);
      if (error instanceof DriftError) throw error;
      throw new DriftError(
        `Unexpected error in ${context}: ${error.message}`,
        ErrorCodes.UNEXPECTED,
        { originalStack: error.stack },
      );
    }
  };
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} [opts] - Retry options
 * @param {number} [opts.maxRetries=3] - Maximum attempts
 * @param {number} [opts.delay=500] - Initial delay in ms
 * @param {number} [opts.backoff=2] - Backoff multiplier
 * @returns {Promise<*>} Result of the first successful call
 * @throws {Error} Last error if all retries fail
 */
export async function withRetry(fn, { maxRetries = 3, delay = 500, backoff = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(backoff, attempt)));
      }
    }
  }
  throw lastError;
}
