/**
 * @fileoverview Welcome page controller — 3-slide onboarding carousel.
 * Shown once on first install via chrome.runtime.onInstalled.
 * @module welcome/welcome
 */

import { applyI18n } from '../utils/helpers.js';
import { getSettings } from '../utils/storage.js';

const TOTAL_SLIDES = 3;
let current = 0;

const $slides = document.querySelectorAll('.slide');
const $dots   = document.querySelectorAll('.dot');
const $btnBack = document.getElementById('btn-back');
const $btnNext = document.getElementById('btn-next');

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();
  await applyStoredTheme();
  bindEvents();
  updateUI();
});

/**
 * Load the user's theme preference from storage and apply it.
 */
async function applyStoredTheme() {
  try {
    const settings = await getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'system');
  } catch {
    document.documentElement.setAttribute('data-theme', 'system');
  }
}

/**
 * Navigate to a specific slide index.
 *
 * @param {number} index - Target slide index (0-based)
 */
function goToSlide(index) {
  if (index < 0 || index >= TOTAL_SLIDES) return;
  current = index;
  updateUI();
}

/**
 * Update the DOM to reflect the current slide.
 */
function updateUI() {
  $slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === current);
  });
  $dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
    dot.setAttribute('aria-selected', String(i === current));
  });

  $btnBack.hidden = current === 0;

  if (current === TOTAL_SLIDES - 1) {
    $btnNext.textContent = chrome.i18n.getMessage('getStarted') || 'Get Started';
  } else {
    $btnNext.textContent = chrome.i18n.getMessage('next') || 'Next';
  }
}

/**
 * Bind navigation event listeners.
 */
function bindEvents() {
  $btnNext.addEventListener('click', () => {
    if (current < TOTAL_SLIDES - 1) {
      goToSlide(current + 1);
    } else {
      // Close welcome tab
      window.close();
    }
  });

  $btnBack.addEventListener('click', () => {
    goToSlide(current - 1);
  });

  $dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goToSlide(parseInt(dot.dataset.dot, 10));
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      goToSlide(current + 1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goToSlide(current - 1);
    }
  });
}
