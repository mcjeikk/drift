# Drift — Stay Present

<p align="center">
  <img src="assets/icons/icon-128.png" alt="Drift icon" width="96">
</p>

<p align="center">
  <strong>Stay present without lifting a finger.</strong><br>
  Smart mouse activity & presence keeper for Chrome.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#install">Install</a> •
  <a href="#usage">Usage</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#development">Development</a>
</p>

---

## Features

### 🌊 Three Activity Modes
- **Simple** — Minimal cursor movement (1-5px back-and-forth)
- **Zen** — Smooth circular motion
- **Human** — Realistic patterns with variable speed, micro-movements, pauses, occasional scrolls and keystrokes

### ⏰ Smart Scheduling
- Work hours mode (Mon–Fri 9am–6pm, configurable)
- Automatic lunch break
- Quick timers: 30m / 1h / 2h / 4h
- Schedule-aware activation and deactivation

### 🧘 Wellness Break Reminders
- **20-20-20 Rule** — Eye rest every 20 minutes
- **Stretch reminder** — Every 45-60 minutes
- Hydration check-ins
- Fully configurable

### 🔍 Presence Detection
- Detects Microsoft Teams and Slack in your browser tabs
- Visual indicator in the popup

### 🆓 100% Free & Open Source
- Every feature included — no premium tiers, no ads, no tracking
- Free forever. No accounts, no subscriptions, no catch.

### 💡 More
- **Keep Awake** — Prevents display sleep
- **Keyboard shortcut** — `Alt+Shift+D` to toggle
- **Badge indicator** — 🟢 active / 🔴 inactive / 🟡 scheduled
- **Dark & light themes** (+ system auto)
- **i18n** — English, Spanish, Portuguese
- **Zero data collection** — Everything stays local

## Install

### From Chrome Web Store
> Coming soon

### From Source (Developer)
1. Clone this repository:
   ```bash
   git clone https://github.com/mcjeikk/drift.git
   ```
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `drift/` directory
5. Pin the Drift icon in your toolbar

## Usage

1. Click the **Drift** icon in your toolbar (or press `Alt+Shift+D`)
2. Toggle the switch to activate
3. Choose your mode: Simple, Zen, or Human
4. Optionally set a quick timer or configure a schedule in Settings

## Privacy

Drift operates entirely locally. **No data collection, no accounts, no external requests.**

See our full [Privacy Policy](store/privacy-policy.md).

## Development

### Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full component map, data flow, and design decisions.

### Project Structure
```
drift/
├── manifest.json           # Extension manifest (MV3)
├── _locales/               # i18n translations (en/es/pt)
├── background/             # Service worker
├── popup/                  # Toolbar popup UI
├── content/                # Injected content scripts
├── settings/               # Options page
├── welcome/                # First-install onboarding
├── utils/                  # Shared modules
├── assets/                 # Icons, styles, themes
├── store/                  # CWS listing assets
├── docs/                   # Documentation
└── tests/                  # Test infrastructure
```

### Key Design Decisions
- **Manifest V3** with ES Modules (`"type": "module"`)
- **No remote code** — everything bundled
- **`activeTab`** permission — no broad host access
- **`chrome.storage.session`** for ephemeral runtime state
- **`chrome.storage.sync`** for user settings (syncs across devices)
- **`chrome.alarms`** for all timing (no `setInterval` in SW)
- **Content script injection** via `chrome.scripting.executeScript` (not declarative)
- **JSDoc** on all functions

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

This tool prevents idle detection. Use responsibly and in compliance with your employer's policies. Drift is designed as a productivity and wellness tool, not as a means to deceive.

---

<p align="center">
  Made with ☕ for remote workers everywhere.
</p>
