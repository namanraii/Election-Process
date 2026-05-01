# Changelog

All notable changes to ElectionIQ are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-05-01

### Added — Code Quality Improvements
- `CONTRIBUTING.md`: Development standards, naming conventions, testing requirements
- `.gcloudignore`: Excludes test files, coverage reports, and docs from Cloud Run deployments
- `tests/ai.test.js`: 8 tests for Cloud Function/Gemini routing, fallback, health state
- `tests/logger.test.js`: 9 tests for log level filtering, message formatting, dynamic switching
- `tests/ui.test.js`: 14 tests for DOM rendering, ARIA attributes, alert banner, consumeInput
- `tests/timeline.test.js`: Expanded to 18 tests — safe DOM construction, keyboard accessibility

### Fixed — Code Quality
- Removed all "StadiumIQ" references across `utils.js`, `perf.js`, `gemini.js`, `firebase.js`, `ai.js`, `functions/index.js`, `style.css`, `CHANGELOG.md`
- Fixed `gemini.js` JSDoc parameters (`phases/milestones/faqs` instead of `gameState/queues/crowd`)
- Fixed `gemini.js` prompt text (`User:` instead of `Attendee:`)
- Fixed `ai.js` JSDoc example and stale URL reference

### Fixed — Security
- Removed hardcoded Maps API key from `index.html` — now loaded dynamically from `window.ENV`
- Rewrote `SECURITY.md` with 8 threat models, rate limiting, prompt injection, Firebase rules
- `timeline.js` rewritten to use safe DOM construction (`createElement` + `textContent`) instead of `innerHTML`

### Fixed — Accessibility
- Timeline items now have `role="button"` and `aria-label` for screen readers
- Timeline wrapper uses `role="list"` for semantic structure

---

## [1.4.0] — 2026-04-18

### Added — Google Cloud Pipeline Expansion
- **Cloud Functions** (`functions/index.js`): HTTP-triggered backend function
  orchestrating Vertex AI + Cloud NL API + BigQuery in a 3-stage server-side pipeline
- **Vertex AI** (`functions/index.js`): Enterprise Gemini 2.5 Flash via `aiplatform.googleapis.com`
  with service-account authentication — replaces browser-exposed API key calls
- **AI Router** (`js/ai.js`): Two-tier request strategy (Cloud Function → direct Gemini fallback)
  with Firebase Performance trace `cloud_function_response` per call
- **Cloud Build CI/CD** (`cloudbuild.yaml`): Full pipeline — npm test → Cloud Function deploy
  → key injection → Cloud Run deploy, with parallel steps and CLOUD_LOGGING_ONLY

### Added — Code Quality
- `js/utils.js`: Shared utility module (`fetchWithTimeout`, `sanitise`, `uniqueId`, `clamp`)
  eliminates duplicate AbortController setup across routes.js, nlp.js, bigquery.js
- `js/ui.js`: DOM abstraction layer — all view concerns extracted from app.js
- `.eslintrc.json`: ESLint config enforcing ES2022 module standards
- `LICENSE`: MIT license

### Added — Tests
- `tests/utils.test.js`: 23 unit tests for sanitise, uniqueId, clamp
- `tests/nlp.test.js`: 11 unit tests for formatAnnotationForContext

### Refactored
- `js/routes.js`: Uses `fetchWithTimeout()` — removed 3 lines of duplicate setup
- `js/nlp.js`: Uses `fetchWithTimeout()` — removed 5 lines of duplicate setup
- `js/bigquery.js`: Uses `fetchWithTimeout()` + `uniqueId()` — consistent insert IDs
- `js/app.js`: All DOM ops delegated to `ui.js`; all sanitisation via `utils.js`;
  chat pipeline now calls `routeAIQuery()` (Cloud Function → Gemini fallback)

---

## [1.3.0] — 2026-04-18

### Added — Google Services
- **BigQuery Streaming Inserts** (`js/bigquery.js`): `streamInteraction()` logs every
  query + intent + response + election state; `streamCivicSnapshot()` logs milestones on
  every Firebase election state update — `bigquery.googleapis.com` REST API
- **Cloud Natural Language API** (`js/nlp.js`): `analyzeEntities` + `analyzeSentiment`
  on every user query; extracted entities injected into Gemini context block
- **Firebase Authentication** (`js/auth.js`): Anonymous sessions via `signInAnonymously()`
- **Google Analytics 4** (`js/analytics.js`): `civic_question_asked`, `milestone_alert_shown`,
  `polling_place_found` event tracking via Firebase Analytics SDK

### Added — Infrastructure
- README.md: Rewritten Google Services section as ASCII pipeline diagram showing
  how NL API → Gemini → BigQuery connect as a data workflow

---

## [1.2.0] — 2026-04-18

### Added — Performance & Monitoring
- **Firebase Performance Monitoring** (`js/perf.js`): `getPerformance()` SDK;
  custom `gemini_response` trace wraps every Gemini API call with `response_length` metric
- `AbortController` timeout on all external API calls (Routes, NL, BigQuery, Gemini)
- 30s response caching in `gemini.js` to prevent duplicate calls on repeated chip taps
- `preconnect` resource hints in `index.html` for Maps and Firebase domains

### Fixed
- CSP meta tag expanded to allow Firebase WebSocket (`wss://`) and Maps internal RPC calls
- `routes.js`: `data` variable scoped inside try/finally to prevent undefined reference

---

## [1.1.0] — 2026-04-17

### Added
- Full JSDoc overhaul across all JS modules (`@module`, `@typedef`, `@example`, `@private`)
- Test suite expanded to 70+ unit tests across intent, proactive, routes, utils, and nlp modules
- All modules use centralised `logger.js` — no direct `console.*` calls

### Fixed
- `parseInt(route.duration, 10)` radix parameter added
- Null guard on Firebase `onValue` callbacks

---

## [1.0.0] — 2026-04-17

### Added — Initial Release
- Gemini 2.5 Flash chat interface with intent classification (7 civic intents)
- Firebase Realtime Database live sync (milestones, phases, faqs, alerts)
- Google Maps JavaScript API — polling place finder with coloured status markers
- Routes API v2 — pedestrian walking directions with `WALK` travel mode
- Proactive alert engine — 4 date-diff triggers firing unprompted Gemini messages
- Cloud Run deployment via Nginx container + Cloud Build source-based build
