/**
 * @fileoverview Central constants for the Drift extension.
 * All magic numbers, keys, and enums live here.
 * @module utils/constants
 */

/** @enum {string} Jiggle modes */
export const MODES = Object.freeze({
  SIMPLE: 'simple',
  ZEN: 'zen',
  HUMAN: 'human',
});

/** @enum {string} Extension activity states */
export const STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SCHEDULED: 'scheduled',
});

/** @enum {string} Message types for inter-component communication */
export const MSG = Object.freeze({
  TOGGLE: 'drift:toggle',
  GET_STATE: 'drift:get-state',
  SET_MODE: 'drift:set-mode',
  SET_TIMER: 'drift:set-timer',
  CANCEL_TIMER: 'drift:cancel-timer',
  DETECT_PRESENCE: 'drift:detect-presence',
  PRESENCE_RESULT: 'drift:presence-result',
  JIGGLE_TICK: 'drift:jiggle-tick',
  SETTINGS_UPDATED: 'drift:settings-updated',
  INJECT_JIGGLER: 'drift:inject-jiggler',
  STOP_JIGGLER: 'drift:stop-jiggler',
});

/** @enum {string} chrome.storage.sync keys */
export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'drift-settings',
  STATS: 'drift-stats',
});

/** @enum {string} chrome.storage.session keys */
export const SESSION_KEYS = Object.freeze({
  RUNTIME_STATE: 'drift-runtime',
});

/** @enum {string} Alarm names */
export const ALARMS = Object.freeze({
  JIGGLE_TICK: 'drift-jiggle',
  KEEPALIVE: 'drift-keepalive',
  EYE_BREAK: 'drift-eye-break',
  STRETCH_BREAK: 'drift-stretch-break',
  TIMER_END: 'drift-timer-end',
  SCHEDULE_CHECK: 'drift-schedule-check',
});

/** @enum {string} Break reminder types */
export const BREAK_TYPES = Object.freeze({
  EYE: 'eye',
  STRETCH: 'stretch',
  WATER: 'water',
});

/** @enum {string} Theme options */
export const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
});

/** Badge colors mapped to status */
export const BADGE_COLORS = Object.freeze({
  [STATUS.ACTIVE]: '#22C55E',
  [STATUS.INACTIVE]: '#EF4444',
  [STATUS.SCHEDULED]: '#EAB308',
});

/** Badge text mapped to status */
export const BADGE_TEXT = Object.freeze({
  [STATUS.ACTIVE]: 'ON',
  [STATUS.INACTIVE]: '',
  [STATUS.SCHEDULED]: 'SCH',
});

/** Day indices (0 = Sunday) */
export const DAYS = Object.freeze({
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
});

/** Jiggle pattern parameters */
export const JIGGLE = Object.freeze({
  /** Simple mode movement range in pixels */
  SIMPLE_RANGE_PX: 3,
  /** Zen mode circle radius in pixels */
  ZEN_RADIUS_PX: 15,
  /** Zen mode angular step per tick (radians) */
  ZEN_STEP_RAD: 0.15,
  /** Human mode max displacement in pixels */
  HUMAN_MAX_PX: 40,
  /** Human mode micro-movement range */
  HUMAN_MICRO_PX: 5,
  /** Probability of a scroll event in human mode (0-1) */
  HUMAN_SCROLL_CHANCE: 0.08,
  /** Probability of a keystroke event in human mode (0-1) */
  HUMAN_TYPE_CHANCE: 0.05,
  /** Probability of a pause in human mode (0-1) */
  HUMAN_PAUSE_CHANCE: 0.12,
  /** Min pause duration in ms */
  HUMAN_PAUSE_MIN_MS: 800,
  /** Max pause duration in ms */
  HUMAN_PAUSE_MAX_MS: 3500,
});

/** Timing defaults */
export const TIMING = Object.freeze({
  /** Default jiggle interval in seconds */
  DEFAULT_INTERVAL_SEC: 15,
  /** Min jiggle interval in seconds */
  MIN_INTERVAL_SEC: 5,
  /** Max jiggle interval in seconds */
  MAX_INTERVAL_SEC: 300,
  /** Keepalive alarm period in minutes */
  KEEPALIVE_PERIOD_MIN: 0.4,
  /** Eye break default interval in minutes */
  EYE_BREAK_INTERVAL_MIN: 20,
  /** Stretch break default interval in minutes */
  STRETCH_BREAK_INTERVAL_MIN: 45,
  /** Schedule check interval in minutes */
  SCHEDULE_CHECK_INTERVAL_MIN: 1,
});

/** Presence detection URL patterns */
export const PRESENCE_PATTERNS = Object.freeze({
  TEAMS: [
    'teams.microsoft.com',
    'teams.live.com',
  ],
  SLACK: [
    'app.slack.com',
    'slack.com/app',
  ],
});

/** Quick timer presets in minutes */
export const QUICK_TIMERS = Object.freeze([30, 60, 120, 240]);

/**
 * Intensity levels: maps slider index to intervalSec.
 * 0 = Low (45s), 1 = Medium (15s), 2 = High (5s)
 */
export const INTENSITY_LEVELS = Object.freeze([
  { key: 'low',  intervalSec: 45 },
  { key: 'med',  intervalSec: 15 },
  { key: 'high', intervalSec: 5 },
]);

/** Default user settings */
export const DEFAULT_SETTINGS = Object.freeze({
  mode: MODES.HUMAN,
  intensity: 5,
  intervalSec: TIMING.DEFAULT_INTERVAL_SEC,
  scheduleEnabled: false,
  workStart: '09:00',
  workEnd: '18:00',
  activeDays: [DAYS.MON, DAYS.TUE, DAYS.WED, DAYS.THU, DAYS.FRI],
  lunchEnabled: false,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  breaksEnabled: true,
  eyeBreakMin: TIMING.EYE_BREAK_INTERVAL_MIN,
  stretchBreakMin: TIMING.STRETCH_BREAK_INTERVAL_MIN,
  theme: THEMES.SYSTEM,
  notificationsEnabled: true,
  startOnLaunch: false,
});

/** Default runtime state */
export const DEFAULT_RUNTIME = Object.freeze({
  status: STATUS.INACTIVE,
  startedAt: null,
  timerEndAt: null,
  mode: null,
  presenceTeams: false,
  presenceSlack: false,
});

/** Extension metadata */
export const META = Object.freeze({
  VERSION: '0.2.0',
  NAME: 'Drift',
  TAGLINE: 'Stay present',
  REPO: 'https://github.com/mcjeikk/drift',
});
