/**
 * intent.js
 * @module intent
 * @description Classifies user civic queries into semantic intent categories.
 * Lightweight regex-based classifier runs client-side with zero latency,
 * preprocessing each query before it reaches Gemini to enable targeted
 * context enrichment (e.g. showing Maps panel for location intents).
 *
 * Pattern evaluation order matters — earlier entries win on ambiguous queries.
 * The ordering below is tuned to maximise precision for the 7 civic categories.
 *
 * Google Services used: None (pure client-side computation)
 */

/**
 * @typedef {"registration"|"glossary"|"id"|"results"|"process"|"location"|"voting"|"general"} CivicIntent
 */

/**
 * Intent → regex pattern map.
 * Evaluated in insertion order; first match wins.
 * Ordering strategy:
 *  1. `registration` — very specific terms, rarely overlaps
 *  2. `glossary` — "what is / define / mean" must precede `process` ("explain")
 *  3. `id` — "identification/document/bring" must precede `voting` ("vote")
 *  4. `results` — "count/certif/recount" must precede `voting` ("votes counted")
 *  5. `process` — "explain/what happens/steps/timeline" must precede `voting`
 *  6. `location` — "where/polling place/find" must precede `voting` ("vote" appears in "voting place")
 *  7. `voting` — broad fallback for ballot/absentee/mail-in/drop-box
 *
 * @constant {Object.<string, RegExp>}
 */
const PATTERNS = {
  registration: /register|eligible|sign.?up|voter.?id|enroll/i,
  glossary:     /what\s+is\b|define\b|what\s+does.*mean|electoral.college|precinct|caucus/i,
  id:           /\bidentification\b|what\s+to\s+bring|what\s+documents|passport/i,
  results:      /\bcount(ed|ing)?\b|tally|winner|concede|certif|recount|project/i,
  process:      /how\s+does|explain|what\s+happens|steps\s+to|timeline|election\s+process/i,
  location:     /where\b|polling.place|near\s+me|directions\s+to|find.*poll|address.*voting/i,
  voting:       /\bvote\b|\bballot\b|polling|absentee|early\s+voting|mail.?in|drop.?box/i,
};

/**
 * Classify a sanitised user message into one of the known civic intent categories.
 * Patterns are evaluated in insertion order; first match wins.
 * Falls back to "general" for unrecognised queries.
 *
 * @param {string} msg - Sanitised user message (max 300 chars, HTML-stripped)
 * @returns {CivicIntent} Intent category string
 *
 * @example
 * classifyIntent("How do I register to vote?");        // → "registration"
 * classifyIntent("What is the Electoral College?");    // → "glossary"
 * classifyIntent("Find my polling place");             // → "location"
 * classifyIntent("Great weather today!");              // → "general"
 */
export function classifyIntent(msg) {
  if (typeof msg !== "string" || msg.length === 0) {return "general";}
  for (const [intent, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(msg)) {return intent;}
  }
  return "general";
}

/**
 * Returns ALL intent categories that a message matches.
 * Useful for complex, multi-intent queries where multiple enrichments apply.
 *
 * @param {string} msg - Sanitised user message
 * @returns {CivicIntent[]} Array of matching intent names (empty if none match)
 *
 * @example
 * classifyIntentAll("explain the election registration process");
 * // → ["registration", "process"]
 */
export function classifyIntentAll(msg) {
  if (typeof msg !== "string") {return [];}
  return Object.entries(PATTERNS)
    .filter(([, pattern]) => pattern.test(msg))
    .map(([intent]) => intent);
}
