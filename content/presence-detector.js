/**
 * @fileoverview Content script for detecting Teams/Slack presence on a page.
 * Injected programmatically when the popup requests presence detection.
 * Checks the page title and DOM for indicators of Teams or Slack.
 * @module content/presence-detector
 */

(() => {
  if (window.__drift_presence_checked) return;
  window.__drift_presence_checked = true;

  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();

  const result = {
    isTeams: false,
    isSlack: false,
  };

  // Teams detection
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) {
    result.isTeams = true;
  }

  // Slack detection
  if (url.includes('app.slack.com') || url.includes('slack.com/app')) {
    result.isSlack = true;
  }

  // Additional DOM-based detection
  if (!result.isTeams && title.includes('microsoft teams')) {
    result.isTeams = true;
  }
  if (!result.isSlack && title.includes('slack')) {
    result.isSlack = true;
  }

  // Report back
  try {
    chrome.runtime.sendMessage({
      type: 'drift:presence-result',
      payload: result,
    });
  } catch {
    // Extension context might be invalidated
  }
})();
