/**
 * @fileoverview Drift service worker — core orchestration layer.
 * Handles jiggling lifecycle, scheduling, keep-awake, break reminders,
 * presence detection, badge updates, and message routing.
 * @module background/service-worker
 */

import {
  MSG, STATUS, ALARMS, BADGE_COLORS, BADGE_TEXT,
  TIMING, BREAK_TYPES, MODES, DEFAULT_RUNTIME,
} from '../utils/constants.js';
import { createLogger } from '../utils/logger.js';
import { getSettings, saveSettings, getRuntime, saveRuntime } from '../utils/storage.js';
import { isWithinSchedule, minutesUntil } from '../utils/helpers.js';
import { getPatternGenerator } from '../utils/patterns.js';
import { withErrorBoundary } from '../utils/errors.js';

/** @type {Set<string>} Set of valid message types for validation */
const VALID_MSG_TYPES = new Set(Object.values(MSG));

const log = createLogger('SW');

/* ================================================================== */
/*  EVENT REGISTRATION — must be synchronous & top-level              */
/* ================================================================== */

chrome.runtime.onInstalled.addListener(withErrorBoundary(handleInstalled, 'onInstalled'));
chrome.runtime.onStartup.addListener(withErrorBoundary(handleStartup, 'onStartup'));
chrome.alarms.onAlarm.addListener(withErrorBoundary(handleAlarm, 'onAlarm'));
chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(withErrorBoundary(handleCommand, 'onCommand'));

/* ================================================================== */
/*  LIFECYCLE                                                         */
/* ================================================================== */

/**
 * Handle extension install or update.
 * @param {chrome.runtime.InstalledDetails} details
 */
async function handleInstalled(details) {
  log.info('onInstalled', details.reason);

  if (details.reason === 'install') {
    // Open welcome page on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
    await saveRuntime({ ...DEFAULT_RUNTIME });
  }

  if (details.reason === 'update') {
    log.info(`Updated from ${details.previousVersion}`);
  }

  // Always ensure schedule-check alarm exists
  await chrome.alarms.create(ALARMS.SCHEDULE_CHECK, {
    periodInMinutes: TIMING.SCHEDULE_CHECK_INTERVAL_MIN,
  });

  // Auto-start if configured
  const settings = await getSettings();
  if (settings.startOnLaunch) {
    await activate(settings.mode);
  } else {
    await updateBadge(STATUS.INACTIVE);
  }
}

/**
 * Handle Chrome profile startup (user opens browser).
 */
async function handleStartup() {
  log.info('onStartup — recovering state');
  const runtime = await getRuntime();

  // If was active before browser restart, resume
  if (runtime.status === STATUS.ACTIVE) {
    const settings = await getSettings();
    await activate(runtime.mode || settings.mode);
    return;
  }

  // Auto-start if configured
  const settings = await getSettings();
  if (settings.startOnLaunch) {
    await activate(settings.mode);
  } else {
    await updateBadge(runtime.status || STATUS.INACTIVE);
  }
}

/* ================================================================== */
/*  ACTIVATION / DEACTIVATION                                         */
/* ================================================================== */

/**
 * Start Drift — enable keep-awake, jiggle alarm, break reminders.
 *
 * @param {string} [mode] - Jiggle mode; defaults to settings
 */
async function activate(mode) {
  const settings = await getSettings();
  const resolvedMode = mode || settings.mode || MODES.HUMAN;

  log.info('Activating', resolvedMode);

  // Keep-awake
  chrome.power.requestKeepAwake('display');

  // Jiggle alarm — use randomized interval for human-like feel
  const baseSec = settings.intervalSec || TIMING.DEFAULT_INTERVAL_SEC;
  await chrome.alarms.create(ALARMS.JIGGLE_TICK, {
    periodInMinutes: baseSec / 60,
  });

  // Keepalive alarm (prevents SW termination while active)
  await chrome.alarms.create(ALARMS.KEEPALIVE, {
    periodInMinutes: TIMING.KEEPALIVE_PERIOD_MIN,
  });

  // Break reminders
  if (settings.breaksEnabled) {
    await chrome.alarms.create(ALARMS.EYE_BREAK, {
      periodInMinutes: settings.eyeBreakMin || TIMING.EYE_BREAK_INTERVAL_MIN,
    });
    await chrome.alarms.create(ALARMS.STRETCH_BREAK, {
      periodInMinutes: settings.stretchBreakMin || TIMING.STRETCH_BREAK_INTERVAL_MIN,
    });
  }

  await saveRuntime({
    status: STATUS.ACTIVE,
    startedAt: Date.now(),
    mode: resolvedMode,
  });
  await updateBadge(STATUS.ACTIVE);

  // Immediately jiggle once
  await performJiggle(resolvedMode);
}

/**
 * Stop Drift — clear alarms, release keep-awake.
 */
async function deactivate() {
  log.info('Deactivating');

  chrome.power.releaseKeepAwake();

  await chrome.alarms.clear(ALARMS.JIGGLE_TICK);
  await chrome.alarms.clear(ALARMS.KEEPALIVE);
  await chrome.alarms.clear(ALARMS.EYE_BREAK);
  await chrome.alarms.clear(ALARMS.STRETCH_BREAK);
  await chrome.alarms.clear(ALARMS.TIMER_END);

  await saveRuntime({
    status: STATUS.INACTIVE,
    startedAt: null,
    timerEndAt: null,
  });
  await updateBadge(STATUS.INACTIVE);
}

/**
 * Toggle between active and inactive.
 */
async function toggle() {
  const runtime = await getRuntime();
  if (runtime.status === STATUS.ACTIVE) {
    await deactivate();
  } else {
    await activate();
  }
}

/* ================================================================== */
/*  JIGGLING                                                          */
/* ================================================================== */

/**
 * Perform one jiggle cycle by injecting the content script
 * into the active tab.
 *
 * @param {string} mode - Jiggle mode
 */
async function performJiggle(mode) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    // Skip chrome:// and other restricted pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
      log.warn('Skipping restricted page:', tab.url?.slice(0, 40));
      return;
    }

    const pattern = getPatternGenerator(mode);
    const events = pattern();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectJiggleEvents,
      args: [events],
    });
  } catch (err) {
    log.warn('Jiggle injection failed:', err.message);
  }
}

/**
 * Injected into the page to dispatch synthetic DOM events.
 * Runs in the page's ISOLATED world.
 *
 * @param {Array} events - Activity events to replay
 */
function injectJiggleEvents(events) {
  // Guard against double injection in same tick
  if (window.__drift_jiggling) return;
  window.__drift_jiggling = true;

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
        // Clamp to viewport
        cx = Math.max(0, Math.min(window.innerWidth, cx));
        cy = Math.max(0, Math.min(window.innerHeight, cy));
        target.dispatchEvent(new MouseEvent('mousemove', {
          clientX: cx, clientY: cy, bubbles: true, cancelable: true,
        }));
        break;
      }
      case 'scroll': {
        window.scrollBy({ top: evt.scroll || 0, behavior: 'smooth' });
        break;
      }
      case 'key': {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: evt.key, code: `Key${(evt.key || 'a').toUpperCase()}`,
          bubbles: true, cancelable: true,
        }));
        document.dispatchEvent(new KeyboardEvent('keyup', {
          key: evt.key, code: `Key${(evt.key || 'a').toUpperCase()}`,
          bubbles: true, cancelable: true,
        }));
        break;
      }
      // 'pause' is a no-op at the injection level
    }
  }

  window.__drift_jiggling = false;
}

/* ================================================================== */
/*  SCHEDULING                                                        */
/* ================================================================== */

/**
 * Evaluate the current schedule and activate/deactivate accordingly.
 */
async function checkSchedule() {
  const settings = await getSettings();
  if (!settings.scheduleEnabled) return;

  const runtime = await getRuntime();
  const inWorkHours = isWithinSchedule(settings.workStart, settings.workEnd, settings.activeDays);
  const inLunch = settings.lunchEnabled
    ? isWithinSchedule(settings.lunchStart, settings.lunchEnd, settings.activeDays)
    : false;

  const shouldBeActive = inWorkHours && !inLunch;

  if (shouldBeActive && runtime.status !== STATUS.ACTIVE) {
    log.info('Schedule: activating (work hours)');
    await activate(settings.mode);
  } else if (!shouldBeActive && runtime.status === STATUS.ACTIVE && !runtime.timerEndAt) {
    log.info('Schedule: deactivating (outside work hours or lunch)');
    await deactivate();
    await updateBadge(STATUS.SCHEDULED);
    await saveRuntime({ status: STATUS.SCHEDULED });
  }
}

/* ================================================================== */
/*  BREAK REMINDERS                                                   */
/* ================================================================== */

/**
 * Show a wellness break notification.
 *
 * @param {string} breakType - One of BREAK_TYPES
 */
async function showBreakReminder(breakType) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const runtime = await getRuntime();
  if (runtime.status !== STATUS.ACTIVE) return;

  /** @type {Record<string, {title: string, body: string}>} */
  const reminders = {
    [BREAK_TYPES.EYE]: {
      title: chrome.i18n.getMessage('breakEyeTitle') || '👀 Eye Break — 20-20-20 Rule',
      body: chrome.i18n.getMessage('breakEyeBody') || 'Look at something 20 feet away for 20 seconds.',
    },
    [BREAK_TYPES.STRETCH]: {
      title: chrome.i18n.getMessage('breakStretchTitle') || '🧘 Time to Stretch!',
      body: chrome.i18n.getMessage('breakStretchBody') || 'Stand up, stretch your arms and back.',
    },
  };

  const reminder = reminders[breakType];
  if (!reminder) return;

  try {
    await chrome.notifications.create(`drift-break-${breakType}-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon-128.png'),
      title: reminder.title,
      message: reminder.body,
      priority: 1,
    });
  } catch (err) {
    log.warn('Failed to show break notification:', err.message);
  }
}

/* ================================================================== */
/*  PRESENCE DETECTION                                                */
/* ================================================================== */

/**
 * Scan open tabs for Teams/Slack presence.
 *
 * @returns {Promise<{teams: boolean, slack: boolean}>}
 */
async function detectPresence() {
  try {
    const tabs = await chrome.tabs.query({});
    let teams = false;
    let slack = false;

    for (const tab of tabs) {
      if (!tab.url) continue;
      const url = tab.url.toLowerCase();
      if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) {
        teams = true;
      }
      if (url.includes('app.slack.com') || url.includes('slack.com/app')) {
        slack = true;
      }
    }

    await saveRuntime({ presenceTeams: teams, presenceSlack: slack });
    return { teams, slack };
  } catch (err) {
    log.warn('Presence detection failed:', err.message);
    return { teams: false, slack: false };
  }
}

/* ================================================================== */
/*  BADGE                                                             */
/* ================================================================== */

/**
 * Update the toolbar badge colour and text.
 *
 * @param {string} status - One of STATUS values
 */
async function updateBadge(status) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[status] || BADGE_COLORS[STATUS.INACTIVE] });
    await chrome.action.setBadgeText({ text: BADGE_TEXT[status] ?? '' });
  } catch (err) {
    log.warn('Badge update failed:', err.message);
  }
}

/* ================================================================== */
/*  TIMER                                                             */
/* ================================================================== */

/**
 * Activate Drift with a countdown timer.
 *
 * @param {number} minutes - Duration in minutes
 */
async function activateWithTimer(minutes) {
  const endAt = Date.now() + minutes * 60 * 1000;
  await activate();
  await saveRuntime({ timerEndAt: endAt });
  await chrome.alarms.create(ALARMS.TIMER_END, { delayInMinutes: minutes });
  log.info(`Timer set for ${minutes} minutes`);
}

/* ================================================================== */
/*  ALARM HANDLER                                                     */
/* ================================================================== */

/**
 * Central alarm dispatcher.
 *
 * @param {chrome.alarms.Alarm} alarm
 */
async function handleAlarm(alarm) {
  switch (alarm.name) {
    case ALARMS.JIGGLE_TICK: {
      const runtime = await getRuntime();
      if (runtime.status === STATUS.ACTIVE) {
        const settings = await getSettings();
        await performJiggle(runtime.mode || settings.mode);
      }
      break;
    }
    case ALARMS.KEEPALIVE:
      // No-op — receiving the event keeps SW alive
      break;
    case ALARMS.EYE_BREAK:
      await showBreakReminder(BREAK_TYPES.EYE);
      break;
    case ALARMS.STRETCH_BREAK:
      await showBreakReminder(BREAK_TYPES.STRETCH);
      break;
    case ALARMS.TIMER_END:
      log.info('Timer ended');
      await deactivate();
      break;
    case ALARMS.SCHEDULE_CHECK:
      await checkSchedule();
      break;
    default:
      log.warn('Unknown alarm:', alarm.name);
  }
}

/* ================================================================== */
/*  MESSAGE HANDLER                                                   */
/* ================================================================== */

/**
 * Central message router.
 *
 * @param {{ type: string, payload: Object }} message
 * @param {chrome.runtime.MessageSender} sender
 * @param {Function} sendResponse
 * @returns {boolean} true if response is async
 */
function handleMessage(message, sender, sendResponse) {
  if (!message || typeof message.type !== 'string') {
    sendResponse({ success: false, error: 'Invalid message: missing type' });
    return false;
  }

  const { type, payload } = message;

  if (!VALID_MSG_TYPES.has(type)) {
    log.warn('Rejected unknown message type:', type);
    sendResponse({ success: false, error: `Unknown message type: ${type}` });
    return false;
  }

  const handle = async () => {
    switch (type) {
      case MSG.TOGGLE:
        await toggle();
        return await getRuntime();

      case MSG.GET_STATE: {
        const runtime = await getRuntime();
        const settings = await getSettings();
        const presence = { teams: runtime.presenceTeams, slack: runtime.presenceSlack };
        return { runtime, settings, presence };
      }

      case MSG.SET_MODE: {
        const validModes = Object.values(MODES);
        if (!payload?.mode || !validModes.includes(payload.mode)) {
          throw new Error(`Invalid mode: ${payload?.mode}`);
        }
        const runtime = await getRuntime();
        await saveRuntime({ mode: payload.mode });
        if (runtime.status === STATUS.ACTIVE) {
          // Update jiggle interval
          await activate(payload.mode);
        }
        return { mode: payload.mode };
      }

      case MSG.SET_TIMER: {
        const minutes = Number(payload?.minutes);
        if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
          throw new Error('Invalid timer duration');
        }
        await activateWithTimer(minutes);
        return await getRuntime();
      }

      case MSG.CANCEL_TIMER:
        await chrome.alarms.clear(ALARMS.TIMER_END);
        await saveRuntime({ timerEndAt: null });
        return await getRuntime();

      case MSG.DETECT_PRESENCE:
        return await detectPresence();

      case MSG.SETTINGS_UPDATED: {
        const settings = await getSettings();
        const runtime = await getRuntime();
        // Re-apply break alarms if needed
        if (runtime.status === STATUS.ACTIVE) {
          if (settings.breaksEnabled) {
            await chrome.alarms.create(ALARMS.EYE_BREAK, {
              periodInMinutes: settings.eyeBreakMin || TIMING.EYE_BREAK_INTERVAL_MIN,
            });
            await chrome.alarms.create(ALARMS.STRETCH_BREAK, {
              periodInMinutes: settings.stretchBreakMin || TIMING.STRETCH_BREAK_INTERVAL_MIN,
            });
          } else {
            await chrome.alarms.clear(ALARMS.EYE_BREAK);
            await chrome.alarms.clear(ALARMS.STRETCH_BREAK);
          }
        }
        return { ok: true };
      }

      default:
        log.warn('Unknown message type:', type);
        return null;
    }
  };

  handle()
    .then((data) => sendResponse({ success: true, data }))
    .catch((err) => {
      log.error('Message handler error:', err);
      sendResponse({ success: false, error: err.message });
    });

  return true; // Keep channel open for async response
}

/* ================================================================== */
/*  COMMAND HANDLER                                                   */
/* ================================================================== */

/**
 * Handle keyboard shortcut commands.
 *
 * @param {string} command - Command name from manifest
 */
async function handleCommand(command) {
  if (command === 'toggle-drift') {
    log.info('Keyboard shortcut: toggle');
    await toggle();
  }
}

/* ================================================================== */

log.info('Drift service worker loaded — v0.1.1');
