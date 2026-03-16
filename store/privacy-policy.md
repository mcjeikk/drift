# Drift — Privacy Policy

**Last updated:** March 16, 2026

## Overview

Drift ("the Extension") is a browser extension that helps users maintain their online presence and prevent computer sleep. We are committed to protecting your privacy.

## Data Collection

**Drift does not collect, store, transmit, or share any personal data.**

Specifically:
- ❌ No analytics or telemetry
- ❌ No user accounts or authentication
- ❌ No network requests to external servers
- ❌ No browsing history tracking
- ❌ No cookies or tracking pixels
- ❌ No third-party SDKs

## Data Storage

Drift stores the following data **locally on your device only**, using Chrome's built-in storage APIs:

| Data | Storage | Purpose |
|------|---------|---------|
| User preferences (mode, schedule, theme) | `chrome.storage.sync` | Sync settings across your Chrome instances |
| Runtime state (active/inactive, timer) | `chrome.storage.session` | Maintain state during browser session |

This data:
- Never leaves your browser
- Is automatically deleted when you uninstall the extension
- Can be cleared at any time via Chrome's extension settings

## Permissions

| Permission | Why It's Needed |
|------------|----------------|
| `activeTab` | Inject activity simulation into the current tab when activated |
| `storage` | Save your preferences locally |
| `alarms` | Schedule jiggle ticks, break reminders, and timers |
| `notifications` | Show wellness break reminders |
| `scripting` | Dynamically inject content scripts for activity simulation |
| `power` | Prevent display sleep using `chrome.power.requestKeepAwake()` |

## Presence Detection

When you open the Drift popup, it checks your open browser tabs to detect if Microsoft Teams or Slack is open. This check:
- Happens only when you open the popup
- Only checks tab URLs (not page content)
- Results are stored in session memory only
- No data is sent anywhere

## Third-Party Services

Drift does not integrate with or send data to any third-party services.

## Children's Privacy

Drift is not directed at children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above and communicated via the extension's changelog.

## Contact

For questions about this privacy policy, please open an issue at:
https://github.com/mcjeikk/drift/issues

## Open Source

Drift is open source. You can review the complete source code at:
https://github.com/mcjeikk/drift
