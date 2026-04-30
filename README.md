# ElectionIQ — Nonpartisan Civic AI Assistant

> **Note**: This project was created specifically for the **PromptWars 2** competition submission.

> An AI-powered assistant that helps citizens understand the election process, timelines, and voting steps — proactively and factually.

## 🔗 Live Demo

[https://electioniq.run.app](https://electioniq.run.app)

---

## 💡 The Vision

ElectionIQ demystifies democracy. Millions of eligible voters don't participate because the registration and voting process is confusing, opaque, or intimidating. ElectionIQ solves this by combining Google's AI, Firebase, and Maps ecosystem to deliver:

- **Proactive civic alerts** — "Registration closes in 2 days — here's how to register"
- **Contextual AI answers** — state-specific, date-aware, factual election guidance
- **Interactive timeline** — click any milestone date to instantly learn about it
- **Polling place finder** — nearest voting locations on a live map with walking time

---

## 🏗️ Architecture

```
Firebase Realtime DB ──► Proactive Engine ──► Gemini 2.5 Flash ──► Chat UI
       │  (milestones,          │  (date-diff triggers)                  ▲
       │   phases, faqs)        └────────────────────────────────────────┘
       │                                                          User Query
       └──► Timeline Widget (left panel)             Intent Classifier
                                                          │
                                              NL API (state/date entities)
                                                          │
                                             Maps JS API (polling places)
```

**Request Pipeline:**
```
User Query
  │
  ├─► Intent Classifier (intent.js) — registration / voting / location / glossary / …
  │
  ├─► Cloud NL API — entity extraction (state names, election offices, dates)
  │
  ├─► Cloud Function (electionIQAssist) — secure backend gateway
  │     ├─► Vertex AI Gemini 2.5 Flash — civic response generation
  │     └─► BigQuery Streaming Insert — logs full interaction record
  │
  └─► Response ──► UI + BigQuery analytics
```

---

## ☁️ Google Services — Comprehensive Integration

ElectionIQ uses **10+ Google services**, each doing meaningful work in the user-facing pipeline:

| Service | Role in ElectionIQ |
|---|---|
| **Vertex AI / Gemini 2.5 Flash** | Core NLU engine. Server-side via Cloud Function with service account auth. Generates nonpartisan, context-aware civic answers with numbered steps and state-specific rules. |
| **Cloud Functions** | Secure HTTP gateway (`electionIQAssist`). Orchestrates the Vertex AI + NL API + BigQuery pipeline. No Vertex AI keys ever reach the browser. |
| **Cloud Natural Language API** | Entity extraction on every user query. "How do I vote in California?" → LOCATION: California → Gemini receives state-specific context for accurate state rules. |
| **BigQuery** | Two streaming tables: `civic_interactions` (every query + AI response) and `milestone_snapshots` (election phase time-series). Powers the admin analytics panel (`?admin=1`). |
| **Firebase Realtime Database** | Backbone for live election data. `onValue()` listeners on `milestones`, `phases`, `faqs`, `alerts` nodes update the timeline widget in real time. |
| **Maps JavaScript API + Places API** | Geocodes user location → finds nearby polling stations via Places text search → renders clickable markers with Open/Early/Closed status overlays. |
| **Routes API v2** | Computes walking time from user to nearest polling station. Route narration injected into Gemini context: "Your polling station is a 12-minute walk away." |
| **Firebase Authentication** | Anonymous `signInAnonymously()` session on load. UID scopes GA4 events and Performance traces across the session. |
| **Google Analytics 4 (Firebase)** | Tracks `civic_question_asked` (intent), `milestone_alert_shown` (trigger key), `polling_place_found`, `milestone_clicked` — complete civic engagement funnel. |
| **Firebase Performance Monitoring** | Custom `gemini_response` and `cloud_function_response` traces wrap every AI call. Latency metrics logged per interaction. |
| **Cloud Run** | Nginx container auto-scales to handle election-day traffic spikes. Source-based deploy via `gcloud run deploy --source .`. |
| **Cloud Build** | CI/CD pipeline builds container from source on every `gcloud run deploy`. Container stored in Artifact Registry. |

---

## ✨ The 5 Feature Pillars

### 1. Proactive Civic Alert Engine
Checks the current date against Firebase milestone timestamps every 60 seconds. Triggers unprompted Gemini-generated alerts:
- `reg-closing` — Registration closes in ≤3 days
- `early-voting-starts` — Early voting begins today
- `election-day` — Today is Election Day with polling hours
- `results-incoming` — Polls closed yesterday, counting begins
- `certification` — Results certification in ≤2 days

Each trigger fires **once per session** (guarded by `_lastTrigger`).

### 2. Step-by-Step AI Chat (Gemini 2.5 Flash)
Nonpartisan civic education assistant with 7 intent categories:
- `registration` — Voter registration, eligibility, deadlines
- `location` — Polling place finder (triggers map panel)
- `voting` — Ballots, mail-in, absentee, drop boxes
- `process` — How elections work, step-by-step
- `results` — Vote counting, certification, recounts
- `glossary` — Electoral College, precinct, caucus
- `id` — ID requirements by state

### 3. Interactive Election Timeline
Left-panel vertical timeline rendered from Firebase `milestones`. Clicking any milestone date triggers a `quickAsk()` with a pre-defined civic question. Updates in real-time via `onValue()`.

### 4. Polling Place Finder (Maps + Places API)
When a "location" intent is detected:
- Geolocates the user via browser Geolocation API
- Queries Places API for nearby voting locations
- Renders up to 5 markers with Open/Early/Closed status
- Injects walking time from Routes API into Gemini context

### 5. Admin Analytics Dashboard (`?admin=1`)
Hidden admin panel showing real-time BigQuery analytics:
- Total queries per session
- Top intent category
- Average response latency
- Proactive alerts delivered

---

## 🚀 How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/namanraii/ElectionIQ.git
cd ElectionIQ

# 2. Configure API keys (copy the example, fill in real values)
cp config.js.example config.js
# Edit config.js with your Firebase, Maps, and Gemini API keys

# 3. Seed Firebase Realtime Database
# Import data/firebase-seed.json into your Firebase project
# Firebase Console → Realtime Database → Import JSON

# 4. Start a local static server
npm run serve
# Then open http://localhost:3000

# 5. (Optional) Deploy Cloud Function
cd functions && npm install
gcloud functions deploy electionIQAssist --runtime nodejs20 --trigger-http --allow-unauthenticated
```

---

## 🧪 How to Run Tests

```bash
npm install
npm test
# Expected output: 6 suites, 55+ tests, all passing

npm run coverage
# Generates coverage report in /coverage directory
```

### Test suites:
| File | What it covers |
|---|---|
| `intent.test.js` | 25+ civic intent classification cases across all 7 categories |
| `proactive.test.js` | All 5 date-diff triggers + edge cases (today = deadline, tomorrow = deadline) |
| `timeline.test.js` | Milestone rendering, status updates (past/current/upcoming) |
| `nlp.test.js` | `formatAnnotationForContext` with civic entity examples |
| `utils.test.js` | `sanitise`, `clamp`, `uniqueId` (all pure functions) |
| `routes.test.js` | Mock fetch for walking route computation |

---

## 🔒 Security

- **No API keys committed** — Keys stored in `config.js` (gitignored). See `.env.example`.
- **Vertex AI never browser-exposed** — All Vertex AI calls go through the Cloud Function with service account authentication.
- **Input sanitisation** — HTML characters stripped (`<>&"'\``) and 300-char limit enforced in both `utils.sanitise()` (client) and `index.js` (server-side Cloud Function).
- **Firebase rules** — Read-only for all public civic data collections.
- **Maps API key restricted** — Limited to specific domain referrers to prevent unauthorised usage.
- **CSP header** — Strict Content-Security-Policy in `<meta>` blocks XSS vectors.

---

## 📁 Project Structure

```
ElectionIQ/
├── index.html              # SPA: timeline left panel, AI chat right panel
├── config.js               # Runtime ENV injection (gitignored — see .env.example)
├── css/
│   └── style.css           # Premium civic green-blue UI + admin panel styles
├── js/
│   ├── app.js              # Main orchestrator — startup, event wiring, handleSubmit
│   ├── gemini.js           # Gemini 2.5 Flash client, civic system prompt, response cache
│   ├── firebase.js         # Realtime DB listeners (milestones, phases, faqs, alerts)
│   ├── maps.js             # Maps JS API + Places API — polling station finder
│   ├── routes.js           # Routes API v2 — walking time to polling station
│   ├── intent.js           # Regex intent classifier (7 civic categories)
│   ├── proactive.js        # Date-diff trigger engine — civic proactive alerts
│   ├── timeline.js         # Election timeline widget renderer
│   ├── nlp.js              # Cloud Natural Language API — entity + sentiment
│   ├── ai.js               # Two-tier AI router (Cloud Function → Gemini fallback)
│   ├── analytics.js        # GA4 civic event tracking
│   ├── bigquery.js         # BigQuery streaming inserts — civic_analytics dataset
│   ├── auth.js             # Firebase anonymous auth
│   ├── perf.js             # Firebase Performance traces
│   ├── ui.js               # DOM rendering, ARIA updates, alert banner
│   ├── logger.js           # Centralised structured logging (no direct console calls)
│   └── utils.js            # fetchWithTimeout, sanitise, uniqueId, clamp
├── data/
│   ├── election.json       # Civic domain data: phases, glossary, FAQs
│   └── firebase-seed.json  # Milestone timestamps for Firebase Realtime DB demo
├── functions/
│   ├── index.js            # Cloud Function: electionIQAssist (Vertex AI + NL + BigQuery)
│   └── package.json        # Cloud Function dependencies
├── tests/
│   ├── intent.test.js      # 25+ intent classification unit tests
│   ├── proactive.test.js   # Proactive trigger unit tests
│   ├── timeline.test.js    # Timeline milestone tests
│   ├── nlp.test.js         # NL annotation formatting tests
│   ├── utils.test.js       # Pure utility function tests
│   └── routes.test.js      # Mock fetch route tests
├── Dockerfile              # Nginx container for Cloud Run
└── nginx.conf              # Port 8080, SPA routing config
```

---

## 📋 Design Decisions

- **Firebase `onValue()` over REST polling** — Zero network overhead, instant push updates when election state changes.
- **Cloud Function as gateway** — Vertex AI service account auth never reaches the browser. A single secure proxy handles all sensitive API calls.
- **Two-tier AI routing** — Cloud Function preferred (Vertex AI, BigQuery logging); falls back to direct Gemini API if CF is cold-starting. Ensures 100% availability.
- **Proactive loop at 60s intervals** — Responsive to minute-level deadline changes without hammering Firebase.
- **Intent classifier before Gemini** — Lightweight regex runs in <1ms client-side, enabling the view toggle (map vs timeline) and context enrichment before any async call.
- **Fire-and-forget BigQuery** — Streaming inserts are never awaited in the UI path. Analytics failure never degrades the civic UX.

---

## ♿ Accessibility

- **Skip to main content** link as first focusable element
- `role="log"` on conversation history with `aria-live="polite"`
- `role="alert"` + `aria-live="assertive"` on proactive civic alerts
- `aria-atomic="true"` on all live region updates
- `role="img" aria-label="..."` on SVG timeline
- `role="legend"` on map status legend
- All interactive elements (chips, form, timeline milestones) keyboard navigable with focus-visible styles
- `prefers-reduced-motion` guard on all animations
- Colour contrast ratio ≥ 4.5:1 across all text (civic trust requires WCAG AA compliance)
- `visually-hidden` class for screen-reader-only hints without visual clutter
