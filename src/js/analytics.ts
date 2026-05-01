/**
 * analytics.js
 * @module analytics
 * @description Google Analytics 4 (GA4) event tracking for ElectionIQ.
 * Tracks key civic interactions and proactive alert deliveries to measure
 * real-world engagement patterns and AI effectiveness in a civic education context.
 *
 * Uses Firebase Analytics SDK (built on GA4) for tight integration with
 * the existing Firebase project, enabling correlated analysis between
 * user events and Firebase Performance traces.
 *
 * Google Services used:
 *  - Firebase Analytics / Google Analytics 4 (firebase.google.com/products/analytics)
 *
 * Tracked events:
 *  - `civic_question_asked`     — User sends a query (includes intent category)
 *  - `quick_action_tapped`      — User taps a pre-built chip action
 *  - `milestone_alert_shown`    — Proactive civic alert delivered by trigger engine
 *  - `polling_place_found`      — User activates polling place finder (location intent)
 *  - `milestone_clicked`        — User clicks a timeline milestone date
 *
 * @see https://firebase.google.com/docs/analytics/get-started?platform=web
 */
import {
  getAnalytics,
  logEvent,
  setUserProperties,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { logger } from "./logger.ts";

/** @type {import("firebase/analytics").Analytics|null} GA4 analytics instance */
let _analytics = null;

/**
 * Initialise Firebase Analytics.
 * Must be called after `initializeApp()`.
 * Safe to call in environments where Analytics is blocked (e.g. ad-blockers).
 *
 * @param {import("firebase/app").FirebaseApp} app - Initialised Firebase app instance
 * @param {string|null} [uid]  - Optional anonymous UID for user-scoped reporting
 * @returns {void}
 */
export function initAnalytics(app, uid = null) {
  try {
    _analytics = getAnalytics(app);
    if (uid) {
      setUserProperties(_analytics, {
        session_type: "anonymous",
        app: "ElectionIQ",
      });
    }
    logEvent(_analytics, "app_open", { app: "ElectionIQ", platform: "web" });
    logger.info("analytics", "GA4 initialised");
  } catch (e) {
    // Non-fatal — tracking failure never degrades the civic UX
    logger.warn("analytics", "Analytics unavailable:", e.message);
  }
}

/**
 * Track a civic chat message submission.
 * Logs the detected intent category alongside the event for funnel analysis.
 *
 * @param {string}  intent          - Classified intent ("registration", "voting", "glossary", etc.)
 * @param {boolean} [isQuickAction=false] - True if triggered via a chip, false if typed
 * @returns {void}
 */
export function trackChatMessage(intent, isQuickAction = false) {
  _logSafe("civic_question_asked", {
    intent_category: intent,
    input_method: isQuickAction ? "quick_action_chip" : "text_input",
    app: "ElectionIQ",
  });
}

/**
 * Track when the proactive alert engine delivers an unprompted civic message.
 * Measures how frequently date-diff triggers fire during a session.
 *
 * @param {string} triggerKey - The proactive trigger key (e.g. "reg-closing", "election-day")
 * @returns {void}
 */
export function trackProactiveAlert(triggerKey) {
  _logSafe("milestone_alert_shown", {
    trigger_key: triggerKey,
    app: "ElectionIQ",
  });
}

/**
 * Track a polling place search activation.
 * Fires when the user asks a "location" intent query that shows the Maps panel.
 * @returns {void}
 */
export function trackPollingPlaceSearch() {
  _logSafe("polling_place_found", { app: "ElectionIQ" });
}

/**
 * Track when a user clicks a milestone on the election timeline.
 * @param {string} milestoneId - The milestone identifier (e.g. "registrationDeadline")
 * @returns {void}
 */
export function trackMilestoneClick(milestoneId) {
  _logSafe("milestone_clicked", { milestone: milestoneId, app: "ElectionIQ" });
}

/**
 * Safely log a GA4 event, swallowing any errors to prevent UX disruption.
 * @param {string} eventName - GA4 event name (snake_case)
 * @param {Object} params    - Event parameters object
 * @returns {void}
 * @private
 */
function _logSafe(eventName, params) {
  if (!_analytics) {
    return;
  }
  try {
    logEvent(_analytics, eventName, params);
  } catch (e) {
    logger.warn("analytics", `Failed to log "${eventName}":`, e.message);
  }
}
