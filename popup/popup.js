/**
 * @fileoverview Popup controller — renders state, handles user interactions,
 * communicates with the service worker via typed messages.
 * @module popup/popup
 */

import { MSG, STATUS, MODES, META } from '../utils/constants.js';
import { sendMessage } from '../utils/messages.js';
import { formatDuration, formatMinutes, minutesUntil, applyI18n } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('popup');

/* ================================================================== */
/*  DOM REFERENCES                                                    */
/* ================================================================== */

const $toggleInput  = document.getElementById('toggle-input');
const $mainToggle   = document.getElementById('main-toggle');
const $statusText   = document.getElementById('status-text');
const $activeTime   = document.getElementById('active-time');
const $modeBtns     = document.querySelectorAll('.mode-btn');
const $timerBtns    = document.querySelectorAll('.timer-btn');
const $timerRemain  = document.getElementById('timer-remaining');
const $scheduleInfo = document.getElementById('schedule-info');
const $scheduleText = document.getElementById('schedule-text');
const $teamsStatus  = document.getElementById('teams-status');
const $slackStatus  = document.getElementById('slack-status');
const $settingsLink = document.getElementById('settings-link');
const $versionText  = document.getElementById('version-text');

/* ================================================================== */
/*  STATE                                                             */
/* ================================================================== */

/** @type {number|null} Interval for updating the active timer display */
let timerInterval = null;

/** @type {Object|null} Cached state from service worker */
let currentState = null;

/* ================================================================== */
/*  INIT                                                              */
/* ================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();
  $versionText.textContent = `v${META.VERSION}`;
  await refreshState();
  bindEvents();
  startTimerUpdate();
  log.info('Popup initialised');
});

/* ================================================================== */
/*  STATE RENDERING                                                   */
/* ================================================================== */

/**
 * Fetch full state from the service worker and render.
 */
async function refreshState() {
  try {
    currentState = await sendMessage(MSG.GET_STATE);
    if (!currentState) return;
    renderState(currentState);
  } catch (err) {
    log.error('Failed to get state:', err);
  }
}

/**
 * Render the full UI from state data.
 *
 * @param {{ runtime: Object, settings: Object, presence: Object }} state
 */
function renderState(state) {
  const { runtime, settings, presence } = state;

  // Toggle
  const isActive = runtime.status === STATUS.ACTIVE;
  $toggleInput.checked = isActive;
  $mainToggle.setAttribute('aria-checked', String(isActive));
  $statusText.textContent = chrome.i18n.getMessage(
    isActive ? 'statusActive' : runtime.status === STATUS.SCHEDULED ? 'statusScheduled' : 'statusInactive'
  ) || (isActive ? 'Active' : 'Inactive');
  $statusText.classList.toggle('status-text--active', isActive);

  // Active time
  renderActiveTime(runtime);

  // Mode
  const activeMode = runtime.mode || settings.mode || MODES.HUMAN;
  $modeBtns.forEach((btn) => {
    const isSelected = btn.dataset.mode === activeMode;
    btn.classList.toggle('mode-btn--active', isSelected);
    btn.setAttribute('aria-checked', String(isSelected));
  });

  // Timer remaining
  renderTimerRemaining(runtime);

  // Schedule info
  if (settings.scheduleEnabled) {
    $scheduleInfo.hidden = false;
    const lunchMin = settings.lunchEnabled ? minutesUntil(settings.lunchStart) : null;
    const endMin = minutesUntil(settings.workEnd);
    if (lunchMin !== null && lunchMin < endMin && lunchMin > 0) {
      $scheduleText.textContent = chrome.i18n.getMessage('scheduleNext',
        [chrome.i18n.getMessage('lunchBreak') || 'Lunch break', formatMinutes(lunchMin)]
      ) || `Next: Lunch break in ${formatMinutes(lunchMin)}`;
    } else {
      $scheduleText.textContent = chrome.i18n.getMessage('scheduleNext',
        [chrome.i18n.getMessage('workEnd') || 'Work end', formatMinutes(endMin)]
      ) || `Next: Work end in ${formatMinutes(endMin)}`;
    }
  } else {
    $scheduleInfo.hidden = true;
  }

  // Presence
  renderPresence(presence);
}

/**
 * Render the active duration display.
 *
 * @param {Object} runtime
 */
function renderActiveTime(runtime) {
  if (runtime.status === STATUS.ACTIVE && runtime.startedAt) {
    const elapsed = Date.now() - runtime.startedAt;
    $activeTime.textContent = chrome.i18n.getMessage('activeFor', [formatDuration(elapsed)])
      || `Active for ${formatDuration(elapsed)}`;
  } else {
    $activeTime.textContent = '';
  }
}

/**
 * Render timer remaining text.
 *
 * @param {Object} runtime
 */
function renderTimerRemaining(runtime) {
  if (runtime.timerEndAt) {
    const remaining = runtime.timerEndAt - Date.now();
    if (remaining > 0) {
      $timerRemain.textContent = `⏱ ${formatDuration(remaining)} remaining`;
    } else {
      $timerRemain.textContent = '';
    }
  } else {
    $timerRemain.textContent = '';
  }
}

/**
 * Render presence detection status.
 *
 * @param {{ teams: boolean, slack: boolean }} presence
 */
function renderPresence(presence) {
  if (presence.teams) {
    $teamsStatus.textContent = '✅';
    $teamsStatus.className = 'presence__status presence__status--found';
  } else {
    $teamsStatus.textContent = '—';
    $teamsStatus.className = 'presence__status presence__status--missing';
  }

  if (presence.slack) {
    $slackStatus.textContent = '✅';
    $slackStatus.className = 'presence__status presence__status--found';
  } else {
    $slackStatus.textContent = '—';
    $slackStatus.className = 'presence__status presence__status--missing';
  }
}

/* ================================================================== */
/*  TIMER UPDATES                                                     */
/* ================================================================== */

/**
 * Start a 1s interval to update active time and timer remaining.
 */
function startTimerUpdate() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!currentState) return;
    renderActiveTime(currentState.runtime);
    renderTimerRemaining(currentState.runtime);
  }, 1000);
}

/* ================================================================== */
/*  EVENT BINDING                                                     */
/* ================================================================== */

/**
 * Bind all interactive event listeners.
 */
function bindEvents() {
  // Main toggle
  $toggleInput.addEventListener('change', async () => {
    try {
      const data = await sendMessage(MSG.TOGGLE);
      if (data) {
        currentState.runtime = data;
        renderState(currentState);
      }
    } catch (err) {
      log.error('Toggle failed:', err);
    }
  });

  // Mode buttons
  $modeBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      try {
        await sendMessage(MSG.SET_MODE, { mode });
        // Update UI optimistically
        $modeBtns.forEach((b) => {
          const selected = b.dataset.mode === mode;
          b.classList.toggle('mode-btn--active', selected);
          b.setAttribute('aria-checked', String(selected));
        });
        if (currentState) currentState.runtime.mode = mode;
      } catch (err) {
        log.error('Set mode failed:', err);
      }
    });

    // Keyboard support for radiogroup
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Timer buttons
  $timerBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const minutes = parseInt(btn.dataset.minutes, 10);
      try {
        const data = await sendMessage(MSG.SET_TIMER, { minutes });
        if (data) {
          currentState.runtime = data;
          renderState(currentState);
        }
      } catch (err) {
        log.error('Set timer failed:', err);
      }
    });
  });

  // Settings link
  $settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Presence detection — refresh on popup open
  sendMessage(MSG.DETECT_PRESENCE).then((result) => {
    if (result) {
      renderPresence(result);
      if (currentState) {
        currentState.presence = result;
      }
    }
  }).catch((err) => log.warn('Presence check failed:', err));
}

/* ================================================================== */
/*  CLEANUP                                                           */
/* ================================================================== */

window.addEventListener('pagehide', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
});
