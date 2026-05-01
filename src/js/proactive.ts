/**
 * proactive.js
 * @module proactive
 * @description Date-diff trigger engine, civic alerts.
 * Runs a 30-second polling loop against Firebase live context and fires
 * unprompted Gemini-generated messages when trigger conditions are met.
 *
 * Trigger rules:
 * 1. reg-closing: <= 3 days to registration deadline
 * 2. early-voting-starts: today is early voting
 * 3. election-day: today is election day
 * 4. results-incoming: 1 day after election
 */
import { getLiveContext } from "./firebase.ts";
import { askGeminiProactive } from "./gemini.ts";
import { trackProactiveAlert } from "./analytics.ts";
import { logger } from "./logger.ts";

/** @type {string|null} Key of the last fired trigger — prevents duplicate alerts */
let _lastTrigger = null;

/** @type {ReturnType<typeof setInterval>|null} Reference to the polling interval */
let _intervalId = null;

/** @constant {number} Proactive check interval in milliseconds */
const POLL_INTERVAL_MS = 30_000;

/** @constant {number} Number of milliseconds in a day */
const MS_PER_DAY = 86_400_000;

/**
 * Start the proactive monitoring loop.
 * Immediately evaluates on first call, then every {@link POLL_INTERVAL_MS} ms.
 *
 * @param {function(string): void} onMessage - Callback that receives the generated alert text
 * @returns {void}
 */
export function startProactiveLoop(onMessage) {
  if (_intervalId) {
    return;
  } // Guard against double-start
  _intervalId = setInterval(() => _evaluate(onMessage), POLL_INTERVAL_MS);
  _evaluate(onMessage); // Trigger immediately on load
}

/**
 * Stop the proactive monitoring loop and reset state.
 * Safe to call even if the loop was never started.
 *
 * @returns {void}
 */
export function stopProactiveLoop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

/**
 * Evaluate the current live context against all trigger conditions.
 * Returns the first matching trigger or null if no conditions are met.
 * The same trigger key will not fire twice — enforced by the caller via `_lastTrigger`.
 *
 * @param {Object} ctx - Live context snapshot from {@link getLiveContext}
 * @returns {{ key: string, reason: string } | null} Trigger descriptor or null
 */
export function evaluateTrigger(ctx) {
  const milestones = ctx.milestones || {};
  const now = Date.now();

  const daysDiff = (ts) => Math.round((ts - now) / MS_PER_DAY);

  if (milestones.registrationDeadline) {
    const regDays = daysDiff(milestones.registrationDeadline);
    if (regDays >= 0 && regDays <= 3) {
      return {
        key: "reg-closing",
        reason: `Voter registration closes in ${regDays} day(s).`,
      };
    }
  }

  if (milestones.earlyVotingStart) {
    const earlyDays = daysDiff(milestones.earlyVotingStart);
    if (earlyDays === 0) {
      return {
        key: "early-voting-starts",
        reason: "Early voting opens today.",
      };
    }
  }

  if (milestones.electionDay) {
    const electionDays = daysDiff(milestones.electionDay);
    if (electionDays === 0) {
      return { key: "election-day", reason: "Today is Election Day." };
    }

    if (electionDays === -1) {
      return {
        key: "results-incoming",
        reason: "Polls closed yesterday. Counting is underway.",
      };
    }
  }

  return null;
}

/**
 * Internal evaluation runner — fetches context, evaluates triggers, and calls Gemini.
 * Guards against repeat triggers using `_lastTrigger`.
 *
 * @param {function(string): void} onMessage - UI callback for the alert message
 * @returns {Promise<void>}
 * @private
 */
async function _evaluate(onMessage) {
  performance.mark("proactive-eval-start");
  const ctx = getLiveContext();
  const trigger = evaluateTrigger(ctx);
  if (!trigger || trigger.key === _lastTrigger) {
    return;
  }
  _lastTrigger = trigger.key;
  trackProactiveAlert(trigger.key); // GA4 event: proactive alert delivered
  try {
    const msg = await askGeminiProactive(trigger.reason, ctx);
    onMessage(msg);
  } catch (e) {
    logger.error("proactive", "Message generation failed:", e.message);
  } finally {
    performance.mark("proactive-eval-end");
    performance.measure(
      "proactive-eval",
      "proactive-eval-start",
      "proactive-eval-end",
    );
  }
}
