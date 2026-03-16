/**
 * @fileoverview Typed message-passing helpers for inter-component communication.
 * Wraps chrome.runtime.sendMessage with type-safe request/response patterns.
 * @module utils/messages
 */

import { createLogger } from './logger.js';

const log = createLogger('messages');

/**
 * Send a typed message to the service worker and await its response.
 *
 * @param {string} type - Message type from {@link MSG}
 * @param {Object} [payload={}] - Message payload
 * @returns {Promise<Object>} Response data
 * @throws {Error} If the service worker returns an error
 *
 * @example
 * import { sendMessage } from '../utils/messages.js';
 * import { MSG } from '../utils/constants.js';
 * const state = await sendMessage(MSG.GET_STATE);
 */
export async function sendMessage(type, payload = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload });
    if (response && !response.success) {
      throw new Error(response.error || 'Unknown service worker error');
    }
    return response?.data ?? null;
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
      log.warn('Extension context invalidated — page needs refresh');
      return null;
    }
    throw error;
  }
}

/**
 * Send a message to a specific tab's content script.
 *
 * @param {number} tabId - Target tab ID
 * @param {string} type - Message type
 * @param {Object} [payload={}] - Message payload
 * @returns {Promise<Object|null>} Response or null if tab unavailable
 */
export async function sendToTab(tabId, type, payload = {}) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type, payload });
  } catch {
    // Tab might not have content script or might be gone
    return null;
  }
}
