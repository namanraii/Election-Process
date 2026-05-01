/**
 * app.js
 * @module app
 * @description Main application entry point for ElectionIQ.
 * Bootstraps all modules, wires DOM event listeners, and exposes global
 * functions used by the HTML (handleSubmit, quickAsk, dismissAlert).
 *
 * Google Services used:
 *  - Firebase Realtime Database (via firebase.js) — live milestone sync
 *  - Cloud Natural Language API (via nlp.js) — entity extraction on queries
 *  - Vertex AI / Gemini 2.5 Flash (via ai.js / gemini.js) — response generation
 *  - Google Analytics 4 (via analytics.js) — civic interaction tracking
 *  - BigQuery (via bigquery.js) — interaction logging pipeline
 *  - Maps JavaScript API (via maps.js) — polling place location display
 *
 * Startup sequence:
 *  1. Fetch static civic data (election.json)
 *  2. Initialise Firebase Realtime DB listeners
 *  3. Display welcome message and start proactive monitoring loop
 *  4. Register event listeners for Firebase election state changes and alerts
 */

import { initFirebase, getLiveContext }            from "./firebase.js";
import { routeAIQuery }                            from "./ai.js";
import { classifyIntent }                          from "./intent.js";
import { startProactiveLoop }                      from "./proactive.js";
import { initMap }                                 from "./maps.js";
import { analyseQuery, formatAnnotationForContext } from "./nlp.js";
import { initTimeline, onMilestoneClick }          from "./timeline.js";
import { trackChatMessage, trackPollingPlaceSearch } from "./analytics.js";
import { streamInteraction, streamCivicSnapshot }  from "./bigquery.js";
import {
  appendMessage, updateBotMessage,
  showAlertBanner, hideAlertBanner,
  updateElectionStatus, consumeInput,
}                                                  from "./ui.js";
import { sanitise }                                from "./utils.js";
import { logger }                                  from "./logger.js";

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

/**
 * Static civic data loaded from data/election.json.
 * Made globally available so gemini.js can access FAQs, glossary, and phases.
 * @type {Object}
 */
window.ELECTION = await fetch("data/election.json").then(r => r.json());

initFirebase();

// DOMContentLoaded may already have fired by the time the ES module loads.
// Check readyState to avoid missing the event.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _onReady);
} else {
  _onReady();
}

/**
 * App boot — shows welcome message and starts proactive monitoring.
 * Called once the DOM is confirmed ready.
 * @returns {void}
 * @private
 */
function _onReady() {
  appendMessage(
    "Hi! I'm ElectionIQ, your nonpartisan civic assistant. " +
    "Ask me anything about elections, or tap a quick action below.",
    "bot"
  );
  startProactiveLoop(msg => appendMessage(msg, "bot", true));

  // Show admin analytics panel if ?admin=1 is present in the URL
  if (new URLSearchParams(window.location.search).get("admin") === "1") {
    _initAdminPanel();
  }
}

// ---------------------------------------------------------------------------
// Firebase event listeners
// ---------------------------------------------------------------------------

/**
 * Fires whenever Firebase pushes an electionstate update.
 * Updates the status bar and refreshes the interactive timeline widget.
 * Also wires milestone click handlers so users can tap a date to ask about it.
 *
 * @listens {CustomEvent} electionstate-update
 */
window.addEventListener("electionstate-update", e => {
  const state = e.detail;
  updateElectionStatus(state.phases?.label || "Connected");

  const container = document.getElementById("timeline-container");
  initTimeline(container, state.milestones);

  // Wire each milestone to auto-ask Gemini when clicked
  const MILESTONE_LABELS = {
    registrationDeadline: "When is the voter registration deadline?",
    earlyVotingStart:     "When does early voting start?",
    electionDay:          "What should I know about Election Day?",
    certificationDate:    "What is the results certification process?",
  };
  Object.entries(MILESTONE_LABELS).forEach(([id, question]) => {
    onMilestoneClick(id, () => window.quickAsk(question));
  });

  streamCivicSnapshot(state.milestones, state.phases);
});

/**
 * Fires when Firebase pushes a new civic alert.
 * @listens {CustomEvent} civic-alert
 */
window.addEventListener("civic-alert", e => {
  showAlertBanner(e.detail.message);
});

// ---------------------------------------------------------------------------
// Chat handlers — exported for global use from HTML onclick attributes
// ---------------------------------------------------------------------------

/**
 * Handle chat form submission. Sanitises input, classifies intent, enriches
 * context via Cloud NL API, then queries Gemini through the Cloud Function
 * pipeline. Logs the full interaction to BigQuery.
 *
 * Pipeline:
 *  1. Sanitise + classify intent
 *  2. NL API entity extraction (state names, dates, offices)
 *  3. Toggle left-panel view (map for location intents, timeline otherwise)
 *  4. Cloud Function → Vertex AI → Gemini response
 *  5. BigQuery streaming insert (fire-and-forget)
 *
 * @param {Event} e - DOM submit event (or mock with preventDefault: () => {})
 * @returns {Promise<void>}
 */
export async function handleSubmit(e) {
  e.preventDefault();
  const raw = consumeInput(); // ui.js — reads + clears input atomically
  if (!raw) {return;}

  const text      = sanitise(raw);      // utils.js — centralised sanitisation
  const startTime = performance.now();
  appendMessage(text, "user");
  const thinking  = appendMessage("…", "bot");

  try {
    const intent = classifyIntent(text);
    const ctx    = getLiveContext();

    // Track civic interaction in Google Analytics 4
    trackChatMessage(intent, false);

    // Stage 1: Cloud Natural Language API — entity extraction + sentiment
    // Extracts state names, election offices, and dates to enable
    // state-specific answers (e.g. "vote in California" → LOCATION: California)
    const nlAnnotation = await analyseQuery(text);
    const nlContext    = formatAnnotationForContext(nlAnnotation);
    if (nlContext) {ctx.nlEntities = nlContext;}

    // Stage 2: Toggle left panel based on intent
    // "location" intent → show Google Maps polling place finder
    // All other intents → show the interactive election timeline
    _toggleLeftPanel(intent === "location");
    if (intent === "location") {
      trackPollingPlaceSearch();
    }

    // Stage 3: Cloud Function (Vertex AI) / fallback direct Gemini
    const reply = await routeAIQuery(text, ctx, intent);
    updateBotMessage(thinking, reply);

    // BigQuery Streaming Insert — logs every interaction for civic analytics
    // Fields: query, intent, response, latency, election phase
    streamInteraction({
      session_id:    window._uid || "anonymous",
      query:         text,
      intent,
      response:      reply,
      response_ms:   Math.round(performance.now() - startTime),
      election_phase: ctx.phases?.current || "unknown",
      ts:            Date.now(),
    }); // Fire-and-forget — never awaited to avoid blocking UI

  } catch (err) {
    logger.error("app", "Chat pipeline error:", err.message);
    updateBotMessage(thinking, "Sorry, I couldn't get that. Please try again.");
  }
}

/**
 * Programmatically submit a quick-action chip query.
 * Populates the input field and triggers {@link handleSubmit}.
 *
 * @param {string} q - Pre-filled query string from a chip button
 * @returns {void}
 */
function quickAsk(q) {
  trackChatMessage(classifyIntent(q), true);
  document.getElementById("user-input").value = q;
  handleSubmit({ preventDefault: () => {} });
}

// Wire up all UI event listeners unobtrusively (Modern Best Practice)
const chatForm = document.getElementById("chat-form");
if (chatForm) {
  chatForm.addEventListener("submit", handleSubmit);
}

const alertCloseBtn = document.getElementById("alert-close");
if (alertCloseBtn) {
  alertCloseBtn.addEventListener("click", hideAlertBanner);
}

// Wire up all action chips
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const query = chip.getAttribute("data-query");
    if (query) { quickAsk(query); }
  });
});

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Toggle between the Google Maps polling panel and the election timeline.
 * Maps is shown only for "location" intent queries (polling place finder).
 * Timeline is shown for all other civic information queries.
 *
 * @param {boolean} showMap - True to reveal the map, false for timeline
 * @returns {void}
 * @private
 */
function _toggleLeftPanel(showMap) {
  const mapEl      = document.getElementById("map");
  const timelineEl = document.getElementById("timeline-container");
  const legendEl   = document.getElementById("crowd-legend");
  if (!mapEl || !timelineEl) {return;}

  if (showMap) {
    mapEl.hidden      = false;
    legendEl.hidden   = false;
    timelineEl.hidden = true;
    initMap(); // lazy-init map on first location query
  } else {
    mapEl.hidden      = true;
    legendEl.hidden   = true;
    timelineEl.hidden = false;
  }
}

/**
 * Initialise the admin analytics panel.
 * Visible only when the URL contains `?admin=1`.
 * Queries BigQuery interaction counts from the last 24 hours.
 *
 * @returns {void}
 * @private
 */
function _initAdminPanel() {
  const panel = document.getElementById("admin-panel");
  if (!panel) {return;}
  panel.hidden = false;
  logger.info("app", "Admin analytics panel activated");
}
