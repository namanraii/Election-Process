# Security Strategy: ElectionIQ

This document outlines the defensive engineering practices implemented in ElectionIQ to protect user data, secure API keys, and maintain system integrity.

## 1. Content Security Policy (CSP)

A strict CSP is enforced in `index.html` via a `<meta>` tag to prevent Cross-Site Scripting (XSS) and govern the loading of external resources.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' https: data: blob:;
  script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://maps.gstatic.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://firebasestorage.googleapis.com wss://*.firebaseio.com;
  frame-src https://*.google.com;
  worker-src blob:;
">
```
- **Constraint**: Only explicitly allowed Google Cloud domains (Firebase, Vertex AI Cloud Function, BigQuery, Analytics, Maps) can be accessed via `fetch` or WebSocket (`wss://`).
- **No `unsafe-eval`**: JavaScript `eval()` is fundamentally blocked, preventing code injection attacks.

## 2. Input Sanitisation Lifecycle

Every user input follows a strict validation and sanitisation path before it hits the DOM or any external API.

1. **Capture**: Input is consumed via `ui.js` (`consumeInput()`), which atomically reads and clears the input field.
2. **Trim & Truncate**: Max length is artificially clamped to 300 characters to prevent denial-of-service via massive payload sizes.
3. **Strip**: `utils.js` -> `sanitise()` removes sensitive HTML angle brackets (`<`, `>`), ampersands, quotes, and backticks.
4. **Server-side**: The Cloud Function (`functions/index.js`) applies the same sanitisation independently, providing defence-in-depth.

```javascript
// js/utils.js — centralised client-side sanitisation
export function sanitise(raw, maxLen = 300) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[<>&"'`]/g, "").substring(0, maxLen).trim();
}
```

## 3. Secret Management & Enterprise AI Pattern

### The Problem with Browser API Keys
Direct client-to-API calls expose API keys to end-users. While Firebase and Maps keys can be restricted by HTTP referer, Gemini/Vertex API keys are highly privileged.

### The Solution: Cloud Function Backend
ElectionIQ routes all AI inference through a secure backend (Google Cloud Functions):
1. **Frontend App** calls `https://...cloudfunctions.net/electionIQAssist`.
2. **Cloud Function** is bound to a locked-down **Google Cloud Service Account**.
3. **Vertex AI API** is called directly via the SDK, authenticated transparently by the Service Account. **No API key is ever embedded or transported.**

### Key Management
- `config.js` in source control uses **placeholder strings** (e.g., `__MAPS_API_KEY__`).
- Real keys are injected at build time via Cloud Build substitutions or `sed` commands during deployment.
- `config.js` is listed in `.gitignore` to prevent accidental commits of real keys.
- `.env.example` documents all required environment variables without exposing actual values.

## 4. Rate Limiting & Abuse Prevention

- **Input length clamped** to 300 characters — prevents payload-based abuse.
- **UI locking** during AI inference — prevents rapid-fire queries.
- **Cloud Function timeout** at 12 seconds — prevents hung connections.
- **Response caching** in `gemini.js` — deduplicates identical queries within a 30-second window.
- **Proactive alert deduplication** — each trigger fires at most once per session via `_lastTrigger` guard.

## 5. Authentication & Privacy

- **Firebase Anonymous Auth** (`signInAnonymously()`) — no PII is collected or stored.
- **No cookies** beyond what Firebase Auth manages internally.
- **No user data persistence** — session-scoped only; no personal data in BigQuery.
- **UID used only** for GA4 event scoping and Performance trace correlation.

## 6. Threat Models Addressed

| Threat | Mitigation |
|---|---|
| **XSS (Stored)** | Zero user inputs are stored in readable Firebase tables. |
| **XSS (Reflected)** | Input `sanitise()` strips HTML; CSP blocks external script injection. |
| **API Key Theft** | Vertex AI calls routed through Service-Account authenticated Cloud Function. Maps/Firebase keys restricted by domain. |
| **Prompt Injection** | System instruction is server-side only (Cloud Function). Client-side system prompt is non-privileged. Input length capped at 300 chars. |
| **DDoS (L7)** | Input length clamped. UI locks during inference. Cloud Run auto-scales with rate limits. |
| **PII Leakage** | `auth.js` enforces strictly Anonymous Firebase Auth sessions. No PII collected or stored. |
| **Man-in-the-Middle** | All API calls use HTTPS. CSP enforces `https:` for all external resources. |
| **Dependency Attacks** | Firebase SDK loaded from `gstatic.com` (Google CDN) with pinned version (`10.7.0`). |

## 7. Firebase Security Rules

Firebase Realtime Database is configured with read-only rules for all public civic data:

```json
{
  "rules": {
    ".read": true,
    ".write": false
  }
}
```

This prevents any client-side writes to election data, ensuring data integrity.
