/**
 * @fileoverview Settings page controller — loads, renders, and persists
 * user preferences using chrome.storage.sync.
 * @module settings/settings
 */

import { MSG, META, THEMES } from '../utils/constants.js';
import { getSettings, saveSettings } from '../utils/storage.js';
import { sendMessage } from '../utils/messages.js';
import { applyI18n } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('settings');

/* ================================================================== */
/*  DOM REFERENCES                                                    */
/* ================================================================== */

const $ = (id) => document.getElementById(id);

const els = {
  mode:           $('default-mode'),
  intensity:      $('intensity'),
  intensityVal:   $('intensity-value'),
  interval:       $('interval'),
  intervalVal:    $('interval-value'),
  scheduleOn:     $('schedule-enabled'),
  scheduleTimes:  $('schedule-times'),
  workStart:      $('work-start'),
  workEnd:        $('work-end'),
  lunchOn:        $('lunch-enabled'),
  lunchTimes:     $('lunch-times'),
  lunchStart:     $('lunch-start'),
  lunchEnd:       $('lunch-end'),
  breaksOn:       $('breaks-enabled'),
  eyeInterval:    $('eye-interval'),
  eyeIntervalVal: $('eye-interval-value'),
  stretchInterval:    $('stretch-interval'),
  stretchIntervalVal: $('stretch-interval-value'),
  theme:          $('theme-select'),
  notificationsOn:$('notifications-enabled'),
  startOnLaunch:  $('start-on-launch'),
  aboutVersion:   $('about-version'),
  toast:          $('toast'),
};

/* ================================================================== */
/*  INIT                                                              */
/* ================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();
  els.aboutVersion.textContent = META.VERSION;

  const settings = await getSettings();
  populateForm(settings);
  applyTheme(settings.theme);
  bindEvents();

  log.info('Settings page loaded');
});

/* ================================================================== */
/*  POPULATE                                                          */
/* ================================================================== */

/**
 * Fill form fields from settings object.
 *
 * @param {Object} settings
 */
function populateForm(settings) {
  els.mode.value = settings.mode;
  els.intensity.value = settings.intensity;
  els.intensityVal.textContent = settings.intensity;
  els.interval.value = settings.intervalSec;
  els.intervalVal.textContent = `${settings.intervalSec}s`;

  els.scheduleOn.checked = settings.scheduleEnabled;
  els.workStart.value = settings.workStart;
  els.workEnd.value = settings.workEnd;

  // Active days
  document.querySelectorAll('.day-btn').forEach((btn) => {
    const day = parseInt(btn.dataset.day, 10);
    const active = settings.activeDays.includes(day);
    btn.setAttribute('aria-pressed', String(active));
  });

  els.lunchOn.checked = settings.lunchEnabled;
  els.lunchStart.value = settings.lunchStart;
  els.lunchEnd.value = settings.lunchEnd;

  els.breaksOn.checked = settings.breaksEnabled;
  els.eyeInterval.value = settings.eyeBreakMin;
  els.eyeIntervalVal.textContent = `${settings.eyeBreakMin}m`;
  els.stretchInterval.value = settings.stretchBreakMin;
  els.stretchIntervalVal.textContent = `${settings.stretchBreakMin}m`;

  els.theme.value = settings.theme;
  els.notificationsOn.checked = settings.notificationsEnabled;
  els.startOnLaunch.checked = settings.startOnLaunch;
}

/* ================================================================== */
/*  COLLECT & SAVE                                                    */
/* ================================================================== */

/**
 * Read all form fields and persist to storage.
 */
async function saveAll() {
  const activeDays = [];
  document.querySelectorAll('.day-btn').forEach((btn) => {
    if (btn.getAttribute('aria-pressed') === 'true') {
      activeDays.push(parseInt(btn.dataset.day, 10));
    }
  });

  const partial = {
    mode: els.mode.value,
    intensity: parseInt(els.intensity.value, 10),
    intervalSec: parseInt(els.interval.value, 10),
    scheduleEnabled: els.scheduleOn.checked,
    workStart: els.workStart.value,
    workEnd: els.workEnd.value,
    activeDays,
    lunchEnabled: els.lunchOn.checked,
    lunchStart: els.lunchStart.value,
    lunchEnd: els.lunchEnd.value,
    breaksEnabled: els.breaksOn.checked,
    eyeBreakMin: parseInt(els.eyeInterval.value, 10),
    stretchBreakMin: parseInt(els.stretchInterval.value, 10),
    theme: els.theme.value,
    notificationsEnabled: els.notificationsOn.checked,
    startOnLaunch: els.startOnLaunch.checked,
  };

  await saveSettings(partial);
  applyTheme(partial.theme);

  // Notify service worker
  try {
    await sendMessage(MSG.SETTINGS_UPDATED);
  } catch {
    // SW might not be running
  }

  showToast();
}

/* ================================================================== */
/*  EVENTS                                                            */
/* ================================================================== */

/** Debounce timer for auto-save */
let saveTimer = null;

/**
 * Schedule a debounced save (300ms).
 */
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveAll(), 300);
}

/**
 * Bind change/input listeners on all form controls.
 */
function bindEvents() {
  // Range live-update labels
  els.intensity.addEventListener('input', () => {
    els.intensityVal.textContent = els.intensity.value;
  });
  els.interval.addEventListener('input', () => {
    els.intervalVal.textContent = `${els.interval.value}s`;
  });
  els.eyeInterval.addEventListener('input', () => {
    els.eyeIntervalVal.textContent = `${els.eyeInterval.value}m`;
  });
  els.stretchInterval.addEventListener('input', () => {
    els.stretchIntervalVal.textContent = `${els.stretchInterval.value}m`;
  });

  // Day picker toggles
  document.querySelectorAll('.day-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!current));
      debouncedSave();
    });
  });

  // All inputs → auto-save
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach((el) => {
    el.addEventListener('change', debouncedSave);
  });
}

/* ================================================================== */
/*  THEME                                                             */
/* ================================================================== */

/**
 * Apply theme to the document root.
 *
 * @param {string} theme - 'dark' | 'light' | 'system'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/* ================================================================== */
/*  TOAST                                                             */
/* ================================================================== */

/** @type {number|null} */
let toastTimer = null;

/**
 * Show a brief "saved" confirmation toast.
 */
function showToast() {
  els.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 1500);
}
