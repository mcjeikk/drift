/**
 * @fileoverview Content script injected dynamically into the active tab.
 * Dispatches synthetic mouse, scroll, and keyboard events to simulate
 * user activity on the page.
 *
 * NOTE: This script is injected via chrome.scripting.executeScript from
 * the service worker with the activity events as arguments. It does NOT
 * run persistently — it executes once per jiggle tick.
 *
 * The primary jiggle logic is handled inline in service-worker.js via
 * the injectJiggleEvents function for performance. This file serves as
 * the persistent content script for presence detection messages.
 * @module content/jiggler
 */

// Guard against double injection
if (!window.__drift_content_injected) {
  window.__drift_content_injected = true;

  /**
   * Listen for direct messages from the service worker.
   */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const { type, payload } = message;

    if (type === 'drift:jiggle-tick' && payload?.events) {
      executeEvents(payload.events);
      sendResponse({ success: true });
      return false;
    }

    if (type === 'drift:stop-jiggler') {
      window.__drift_content_injected = false;
      sendResponse({ success: true });
      return false;
    }

    return false;
  });
}

/**
 * Dispatch a list of activity events on the current page.
 *
 * @param {Array<Object>} events - Activity events from pattern generators
 */
function executeEvents(events) {
  const target = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  ) || document.body;

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;

  for (const evt of events) {
    switch (evt.type || 'move') {
      case 'move': {
        cx += (evt.dx || 0);
        cy += (evt.dy || 0);
        cx = Math.max(0, Math.min(window.innerWidth, cx));
        cy = Math.max(0, Math.min(window.innerHeight, cy));
        target.dispatchEvent(new MouseEvent('mousemove', {
          clientX: cx,
          clientY: cy,
          bubbles: true,
          cancelable: true,
        }));
        break;
      }
      case 'scroll': {
        window.scrollBy({ top: evt.scroll || 0, behavior: 'smooth' });
        break;
      }
      case 'key': {
        const keyCode = `Key${(evt.key || 'a').toUpperCase()}`;
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: evt.key,
          code: keyCode,
          bubbles: true,
          cancelable: true,
        }));
        document.dispatchEvent(new KeyboardEvent('keyup', {
          key: evt.key,
          code: keyCode,
          bubbles: true,
          cancelable: true,
        }));
        break;
      }
      // 'pause' — intentional no-op
    }
  }
}
