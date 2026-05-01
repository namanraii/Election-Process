/**
 * firebase.js
 * @module firebase
 * @description Initialises the Firebase Realtime Database connection and
 * maintains a live in-memory `_state` object via `onValue()` listeners.
 * All other modules call {@link getLiveContext} to read the current state.
 *
 * Google Services used:
 *  - Firebase Realtime Database (firebaseio.com) — zero-poll live data sync
 *    Watches the `milestones`, `phases`, `faqs`, and `alerts` nodes.
 * @see https://firebase.google.com/docs/database/web/read-and-write
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { initPerformance } from "./perf.ts";
import { initAuth } from "./auth.ts";
import { initAnalytics } from "./analytics.ts";

/** @type {import("firebase/database").Database} */
let _db;

/**
 * Reactive state object — updated automatically by Firebase `onValue` listeners.
 * @type {{ milestones: Object, phases: Object, faqs: Object, alerts: Object }}
 */
const _state = { milestones: {}, phases: {}, faqs: {}, alerts: {} };

/** Database nodes to subscribe to on startup. */
const WATCHED_NODES = ["milestones", "phases", "faqs", "alerts"];

/**
 * Initialise Firebase and start all realtime listeners.
 * Dispatches an `electionstate-update` CustomEvent on every phase/milestone change.
 * Should be called exactly once at app startup.
 *
 * @returns {void}
 */
export async function initFirebase() {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE,
    messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT,
  });
  _db = getDatabase(app);
  initPerformance(app); // Firebase Performance Monitoring — 7th Google service

  // Firebase Authentication — anonymous sessions for user scoping
  const uid = await initAuth(app);

  // Google Analytics 4 via Firebase Analytics — event tracking
  initAnalytics(app, uid);

  WATCHED_NODES.forEach((node) => {
    onValue(ref(_db, node), (snap) => {
      _state[node] = snap.val() || {};
      if (node === "alerts") {
        _handleNewAlerts(_state.alerts);
      }
      if (node === "phases" || node === "milestones") {
        window.dispatchEvent(
          new CustomEvent("electionstate-update", { detail: _state }),
        );
      }
    });
  });
}

/**
 * Returns a shallow copy of the current live state snapshot.
 * Safe to call from any module at any time.
 *
 * @returns {{ milestones: Object, phases: Object, faqs: Object, alerts: Object }}
 */
export function getLiveContext() {
  return { ..._state };
}

/**
 * Dispatch a `civic-alert` event for any alerts received within the last 90 seconds.
 * Prevents re-firing stale alerts from a previous Firebase session.
 *
 * @param {Object} alerts - Map of alert objects, each with a Unix `timestamp` field
 * @returns {void}
 * @private
 */
function _handleNewAlerts(alerts) {
  if (!alerts || typeof alerts !== "object") {
    return;
  }
  const recent = Object.values(alerts).filter(
    (a) => a?.timestamp && Date.now() / 1000 - a.timestamp < 90,
  );
  if (recent.length) {
    window.dispatchEvent(new CustomEvent("civic-alert", { detail: recent[0] }));
  }
}
