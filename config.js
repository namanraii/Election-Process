/**
 * config.js
 * Injects runtime environment variables into window.ENV.
 * Keys are loaded here for the hackathon demo.
 * In production (Cloud Run), these are replaced by Secret Manager at build time.
 *
 * ⚠️  This file is gitignored — do NOT commit real API keys.
 */
window.ENV = {
  GEMINI_API_KEY:      "__GEMINI_API_KEY__",
  FIREBASE_API_KEY:    "__FIREBASE_API_KEY__",
  FIREBASE_AUTH_DOMAIN:"__FIREBASE_AUTH_DOMAIN__",
  FIREBASE_PROJECT_ID: "__FIREBASE_PROJECT_ID__",
  FIREBASE_STORAGE:    "__FIREBASE_STORAGE__",
  FIREBASE_SENDER_ID:  "__FIREBASE_SENDER_ID__",
  FIREBASE_APP_ID:     "__FIREBASE_APP_ID__",
  FIREBASE_MEASUREMENT:"__FIREBASE_MEASUREMENT__",
  FIREBASE_DB_URL:     "__FIREBASE_DB_URL__",
  MAPS_API_KEY:        "__MAPS_API_KEY__",
  ROUTES_API_KEY:      "__ROUTES_API_KEY__",
};
