/**
 * @fileoverview Human-like activity pattern generators for mouse movement,
 * scrolling, and keystroke simulation.
 * @module utils/patterns
 */

import { JIGGLE } from './constants.js';
import { randomInt, randomFloat } from './helpers.js';

/* ------------------------------------------------------------------ */
/*  Simple Mode — minimal back-and-forth movement                     */
/* ------------------------------------------------------------------ */

/**
 * Generate a simple jiggle: small px offset and return.
 *
 * @returns {{ dx: number, dy: number }[]} Array of movement steps
 */
export function simplePattern() {
  const d = randomInt(1, JIGGLE.SIMPLE_RANGE_PX);
  const dir = Math.random() > 0.5 ? 1 : -1;
  return [
    { dx: d * dir, dy: 0 },
    { dx: -d * dir, dy: 0 },
  ];
}

/* ------------------------------------------------------------------ */
/*  Zen Mode — smooth circular arc                                    */
/* ------------------------------------------------------------------ */

/** @type {number} Current angle for zen circle */
let _zenAngle = 0;

/**
 * Generate the next step of a smooth circular motion.
 *
 * @returns {{ dx: number, dy: number }[]} Single step on the circle
 */
export function zenPattern() {
  _zenAngle += JIGGLE.ZEN_STEP_RAD + randomFloat(-0.03, 0.03);
  const r = JIGGLE.ZEN_RADIUS_PX + randomFloat(-2, 2);
  return [
    {
      dx: Math.round(Math.cos(_zenAngle) * r),
      dy: Math.round(Math.sin(_zenAngle) * r),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Human Mode — realistic, unpredictable activity                    */
/* ------------------------------------------------------------------ */

/**
 * Generate a human-like activity event sequence.
 * May include mouse moves, scroll, typing, or deliberate pauses.
 *
 * @returns {{ type: string, dx?: number, dy?: number, scroll?: number,
 *             key?: string, pause?: number }[]} Activity events
 */
export function humanPattern() {
  const events = [];

  // Decide if this tick is a pause (do nothing)
  if (Math.random() < JIGGLE.HUMAN_PAUSE_CHANCE) {
    events.push({
      type: 'pause',
      pause: randomInt(JIGGLE.HUMAN_PAUSE_MIN_MS, JIGGLE.HUMAN_PAUSE_MAX_MS),
    });
    return events;
  }

  // Primary mouse movement — variable speed and direction
  const segments = randomInt(1, 3);
  for (let i = 0; i < segments; i++) {
    const angle = randomFloat(0, Math.PI * 2);
    const distance = randomFloat(JIGGLE.HUMAN_MICRO_PX, JIGGLE.HUMAN_MAX_PX);
    events.push({
      type: 'move',
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
    });
  }

  // Micro-movement back towards centre
  events.push({
    type: 'move',
    dx: randomInt(-JIGGLE.HUMAN_MICRO_PX, JIGGLE.HUMAN_MICRO_PX),
    dy: randomInt(-JIGGLE.HUMAN_MICRO_PX, JIGGLE.HUMAN_MICRO_PX),
  });

  // Occasional scroll
  if (Math.random() < JIGGLE.HUMAN_SCROLL_CHANCE) {
    events.push({
      type: 'scroll',
      scroll: randomInt(-120, 120),
    });
  }

  // Occasional keystroke
  if (Math.random() < JIGGLE.HUMAN_TYPE_CHANCE) {
    const keys = 'abcdefghijklmnopqrstuvwxyz     ';
    events.push({
      type: 'key',
      key: keys[randomInt(0, keys.length - 1)],
    });
  }

  return events;
}

/**
 * Pick the correct pattern generator for a given mode.
 *
 * @param {string} mode - One of MODES values
 * @returns {Function} Pattern generator function
 */
export function getPatternGenerator(mode) {
  switch (mode) {
    case 'zen': return zenPattern;
    case 'simple': return simplePattern;
    case 'human':
    default: return humanPattern;
  }
}
