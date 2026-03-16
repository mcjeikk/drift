# Drift — Architecture

## Overview

Drift is a Manifest V3 Chrome extension built with ES Modules, following a clear separation of concerns across its components.

## Component Map

```
┌─────────────────────────────────────────────────────┐
│                    POPUP (UI)                       │
│  popup.html / popup.js / popup.css                  │
│  - Toggle on/off                                    │
│  - Mode selector                                    │
│  - Quick timer                                      │
│  - Presence display                                 │
│  - Schedule info                                    │
└─────────────┬───────────────────────────────────────┘
              │ chrome.runtime.sendMessage()
              ▼
┌─────────────────────────────────────────────────────┐
│              SERVICE WORKER (Core)                  │
│  background/service-worker.js                       │
│  - Message routing                                  │
│  - Jiggle lifecycle (activate/deactivate/toggle)    │
│  - chrome.power keepawake                           │
│  - chrome.alarms scheduling                         │
│  - Break reminder notifications                     │
│  - Presence detection (tab scanning)                │
│  - Badge updates                                    │
│  - Timer management                                 │
└──────┬──────────────┬───────────────────────────────┘
       │              │ chrome.scripting.executeScript()
       │              ▼
       │  ┌───────────────────────────────────┐
       │  │     CONTENT SCRIPTS (Injected)    │
       │  │  content/jiggler.js               │
       │  │  - Dispatch MouseEvent            │
       │  │  - Dispatch KeyboardEvent         │
       │  │  - Trigger scrollBy()             │
       │  │  content/presence-detector.js     │
       │  │  - Detect Teams/Slack in DOM      │
       │  └───────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│              SETTINGS PAGE                          │
│  settings/settings.html / settings.js               │
│  - All user preferences                            │
│  - Schedule configuration                           │
│  - Break reminder tuning                            │
│  - Theme selection                                  │
│  - Persists via chrome.storage.sync                 │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│              WELCOME PAGE                           │
│  welcome/welcome.html / welcome.js                  │
│  - 3-slide onboarding carousel                      │
│  - Shown once on install                            │
└─────────────────────────────────────────────────────┘
```

## Data Flow

```
Settings ──(chrome.storage.sync)──► Service Worker ──► Alarms
                                         │
State ──(chrome.storage.session)──► Popup (read on open)
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                              Badge Update  Content Script
                                            Injection
```

## Storage Strategy

| Store | Area | Purpose | Size |
|-------|------|---------|------|
| User preferences | `chrome.storage.sync` | Settings, mode, schedule | ~2 KB |
| Runtime state | `chrome.storage.session` | Status, timer, presence | ~500 B |

## Alarm Architecture

| Alarm | Period | Purpose |
|-------|--------|---------|
| `drift-jiggle` | `intervalSec / 60` min | Trigger jiggle tick |
| `drift-keepalive` | 0.4 min (24s) | Prevent SW termination |
| `drift-eye-break` | 20 min (default) | Eye break notification |
| `drift-stretch-break` | 45 min (default) | Stretch notification |
| `drift-timer-end` | User-set | End quick timer |
| `drift-schedule-check` | 1 min | Evaluate work schedule |

## Security Model

- No host permissions (uses `activeTab`)
- No remote code execution
- Content scripts run in ISOLATED world
- All data stays local
- No external network requests

## i18n

Three locales: `en`, `es`, `pt`. All user-facing strings are externalized to `_locales/*/messages.json` and applied via `data-i18n` attributes.

## Theme System

CSS custom properties in `assets/styles/themes.css`. Three modes:
- Dark (default)
- Light
- System (follows `prefers-color-scheme`)

Applied via `data-theme` attribute on `<html>`.
