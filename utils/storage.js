/**
 * @fileoverview Typed wrappers around chrome.storage with caching.
 * Uses chrome.storage.sync for user settings and chrome.storage.session
 * for ephemeral runtime state.
 * @module utils/storage
 */

import { STORAGE_KEYS, SESSION_KEYS, DEFAULT_SETTINGS, DEFAULT_RUNTIME } from './constants.js';
import { createLogger } from './logger.js';

const log = createLogger('storage');

/* ------------------------------------------------------------------ */
/*  Settings (chrome.storage.sync — persists across devices)          */
/* ------------------------------------------------------------------ */

/** @type {Object|null} In-memory cache */
let _settingsCache = null;

/**
 * Load user settings, merged with defaults for any missing keys.
 *
 * @returns {Promise<Object>} Current settings object
 */
export async function getSettings() {
  if (_settingsCache) return { ...DEFAULT_SETTINGS, ..._settingsCache };
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    _settingsCache = result[STORAGE_KEYS.SETTINGS] || {};
    return { ...DEFAULT_SETTINGS, ..._settingsCache };
  } catch (err) {
    log.error('Failed to read settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist a partial settings update (merged with existing settings).
 *
 * @param {Object} partial - Keys to update
 * @returns {Promise<void>}
 */
export async function saveSettings(partial) {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  _settingsCache = merged;
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: merged });
  log.info('Settings saved', Object.keys(partial));
}

/* ------------------------------------------------------------------ */
/*  Runtime state (chrome.storage.session — in-memory only)           */
/* ------------------------------------------------------------------ */

/** @type {Object|null} In-memory cache */
let _runtimeCache = null;

/**
 * Get the current runtime state, merged with defaults.
 *
 * @returns {Promise<Object>} Current runtime state
 */
export async function getRuntime() {
  if (_runtimeCache) return { ...DEFAULT_RUNTIME, ..._runtimeCache };
  try {
    const result = await chrome.storage.session.get(SESSION_KEYS.RUNTIME_STATE);
    _runtimeCache = result[SESSION_KEYS.RUNTIME_STATE] || {};
    return { ...DEFAULT_RUNTIME, ..._runtimeCache };
  } catch (err) {
    log.error('Failed to read runtime state:', err);
    return { ...DEFAULT_RUNTIME };
  }
}

/**
 * Persist a partial runtime state update.
 *
 * @param {Object} partial - Keys to update
 * @returns {Promise<void>}
 */
export async function saveRuntime(partial) {
  const current = await getRuntime();
  const merged = { ...current, ...partial };
  _runtimeCache = merged;
  await chrome.storage.session.set({ [SESSION_KEYS.RUNTIME_STATE]: merged });
}

/* ------------------------------------------------------------------ */
/*  Cache invalidation on external changes                            */
/* ------------------------------------------------------------------ */

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
    _settingsCache = changes[STORAGE_KEYS.SETTINGS].newValue || {};
    log.info('Settings cache refreshed from external change');
  }
  if (area === 'session' && changes[SESSION_KEYS.RUNTIME_STATE]) {
    _runtimeCache = changes[SESSION_KEYS.RUNTIME_STATE].newValue || {};
  }
});
