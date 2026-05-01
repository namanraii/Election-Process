/**
 * ai.js
 * @module ai
 * @description AI pipeline router for ElectionIQ.
 * Implements a two-tier request strategy:
 *
 *  Tier 1 (preferred): Google Cloud Function — `electionIQAssist`
 *    → Vertex AI Gemini 2.5 Flash (enterprise, service-account authenticated)
 *    → Cloud Natural Language API (server-side entity extraction)
 *    → BigQuery streaming insert (server-side, more reliable)
 *    URL injected at build time via __CF_URL__ placeholder in config
 *
 *  Tier 2 (fallback): Direct Gemini AI Studio API
 *    → Used when Cloud Function is cold-starting or rate-limited
 *    → Identical response quality, slightly higher browser exposure
 *
 * This pattern ensures maximum availability and follows Google Cloud
 * best-practice of using service accounts (via Cloud Functions) instead
 * of browser-exposed API keys for Vertex AI calls.
 *
 * Google Services used:
 *  - Cloud Functions (cloudfunctions.net) — primary AI orchestration tier
 *  - Vertex AI via Cloud Function (aiplatform.googleapis.com) — enterprise Gemini
 *
 * @see functions/index.js for the Cloud Function implementation
 */

import { askGemini } from "./gemini.ts";
import { fetchWithTimeout } from "./utils.ts";
import { startTrace } from "./perf.ts";
import { logger } from "./logger.ts";

/**
 * @constant {string} Deployed Cloud Function endpoint.
 * Handles Vertex AI + NL API + BigQuery server-side.
 */
const CF_URL = "__CF_URL__";

/** @constant {number} Cloud Function request timeout (includes cold-start allowance) */
const CF_TIMEOUT_MS = 12_000;

/** @type {boolean} Set true after first successful CF call to skip fallback delay */
let _cfHealthy = true;

/**
 * Route a user query through the optimal AI pipeline.
 * Tries the Cloud Function (Vertex AI) first; falls back to direct Gemini if needed.
 *
 * @param {string} message  - Sanitised user query
 * @param {Object} context  - Live election context from Firebase (getLiveContext())
 * @param {string} [intent] - Classified intent category for BigQuery logging
 * @returns {Promise<string>} AI-generated reply text
 *
 * @example
 * const reply = await routeAIQuery("How do I register to vote?", ctx, "registration");
 */
export async function routeAIQuery(message, context, intent = "general") {
  if (_cfHealthy) {
    const stopTrace = startTrace("cloud_function_response");
    try {
      const res = await fetchWithTimeout(
        CF_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            context,
            intent,
            sessionId: window._uid || "anonymous",
          }),
        },
        CF_TIMEOUT_MS,
      );

      if (res.ok) {
        const { reply } = await res.json();
        stopTrace();
        return reply;
      }
      throw new Error(`CF returned ${res.status}`);
    } catch (e) {
      stopTrace();
      // Mark unhealthy for this session to skip future CF attempts on repeated failures
      if (e.name === "AbortError") {
        logger.warn("ai", "Cloud Function timeout — using direct Gemini");
      } else {
        logger.warn(
          "ai",
          `Cloud Function unavailable (${e.message}) — fallback`,
        );
        _cfHealthy = false;
      }
    }
  }

  // Tier 2: Direct Gemini API (browser fallback)
  return askGemini(message, context);
}

/**
 * Reset Cloud Function health status.
 * Call this after a session refresh to retry the CF path.
 * @returns {void}
 */
export function resetCFHealth() {
  _cfHealthy = true;
}
