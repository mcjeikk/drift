/**
 * @fileoverview General-purpose helper functions.
 * @module utils/helpers
 */

/**
 * Return a random integer between min and max (inclusive).
 *
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return a random float between min and max.
 *
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number}
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Sleep for a given duration.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format elapsed milliseconds as a human-readable string (e.g. "2h 34m").
 *
 * @param {number} ms - Elapsed time in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format minutes remaining as a compact string.
 *
 * @param {number} minutes - Minutes remaining
 * @returns {string} e.g. "1h 23m" or "45m"
 */
export function formatMinutes(minutes) {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Check whether the current time falls within a HH:MM range on a given set of days.
 *
 * @param {string} startTime - "HH:MM" start
 * @param {string} endTime - "HH:MM" end
 * @param {number[]} activeDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {boolean}
 */
export function isWithinSchedule(startTime, endTime, activeDays) {
  const now = new Date();
  const day = now.getDay();
  if (!activeDays.includes(day)) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  return nowMin >= startMin && nowMin < endMin;
}

/**
 * Calculate minutes until a given HH:MM time today (or tomorrow if already past).
 *
 * @param {string} time - "HH:MM"
 * @returns {number} Minutes remaining
 */
export function minutesUntil(time) {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const targetMin = h * 60 + m;
  const diff = targetMin - nowMin;
  return diff > 0 ? diff : diff + 1440;
}

/**
 * Apply i18n translations to all elements with a data-i18n attribute.
 * Sets textContent to the corresponding chrome.i18n message.
 *
 * @param {Document|Element} root - DOM root to scan
 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('placeholder', msg);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('title', msg);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('aria-label', msg);
  });
}
