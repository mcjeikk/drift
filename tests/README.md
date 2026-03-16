# Drift — Testing

## Strategy

Following the testing pyramid:

```
    ╱╲
   ╱E2E╲        Puppeteer/Playwright — extension integration
  ╱──────╲
 ╱Integration╲   Chrome API mocks — component interaction
╱──────────────╲
╱  Unit Tests   ╲  Pure functions — helpers, patterns, storage
╱────────────────╲
```

## Running Tests

```bash
# Unit tests (when test runner is configured)
npm test

# E2E tests
npm run test:e2e
```

## Unit Test Coverage

Priority modules for unit testing:

| Module | What to Test |
|--------|--------------|
| `utils/helpers.js` | `formatDuration`, `formatMinutes`, `isWithinSchedule`, `minutesUntil`, `randomInt` |
| `utils/patterns.js` | Pattern generators return valid event arrays, randomness bounds |
| `utils/storage.js` | Cache behaviour, merge with defaults, error fallback |
| `utils/errors.js` | `DriftError` construction, `withErrorBoundary` wrapping, `withRetry` backoff |

## E2E Test Scenarios

- [ ] Extension loads without errors
- [ ] Popup renders with all sections
- [ ] Toggle activates/deactivates badge
- [ ] Mode selector updates state
- [ ] Timer buttons set alarms
- [ ] Settings page saves and restores values
- [ ] Welcome page shows on first install
- [ ] Keyboard shortcut (Alt+Shift+D) toggles state
- [ ] Break notifications appear when active
- [ ] Restricted pages (chrome://) are skipped gracefully
- [ ] Service worker survives termination and recovers state

## Mocking Chrome APIs

See `BEST_PRACTICES.md` §9.2 for the chrome API mock setup pattern used in unit tests.
