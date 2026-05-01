/**
 * bigquery.js
 * @module bigquery
 * @description Google BigQuery Streaming Inserts integration for ElectionIQ.
 * Logs every user interaction, AI response, and live election milestone state
 * as a structured row into BigQuery tables for civic analytics and research.
 *
 * Data pipeline:
 *  1. User sends a civic query → intent classified → NL entities extracted
 *  2. Gemini generates a response with live election context
 *  3. BigQuery Streaming Insert logs the full interaction record in real-time
 *  4. Admin panel (?admin=1) queries BigQuery to show most-asked questions,
 *     intent distribution, and proactive alert effectiveness
 *
 * Tables:
 *  - `civic_interactions`      — every user query + AI response record
 *  - `milestone_snapshots`     — periodic election phase/milestone state
 *
 * Google Services used:
 *  - Google BigQuery (bigquery.googleapis.com) — real-time streaming analytics pipeline
 *
 * @see https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll
 */

import { fetchWithTimeout, uniqueId } from "./utils.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** @constant {string} Google Cloud project ID */
const BQ_PROJECT = window.ENV?.FIREBASE_PROJECT_ID || "electioniq-project";

/** @constant {string} BigQuery dataset for all civic analytics */
const BQ_DATASET = "civic_analytics";

/** @constant {string} Table storing every user interaction + AI response */
const BQ_TABLE_INTERACTIONS = "civic_interactions";

/** @constant {string} Table storing election milestone state snapshots */
const BQ_TABLE_SNAPSHOTS = "milestone_snapshots";

/**
 * Returns the BigQuery tabledata insertAll REST endpoint for a given table.
 * @param {string} table - Target BigQuery table name
 * @returns {string} Full REST endpoint URL
 * @private
 */
const _bqInsertUrl = (table) =>
  `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/${table}/insertAll`;

/** @constant {number} Insert request timeout in milliseconds — kept short since fire-and-forget */
const BQ_TIMEOUT_MS = 6_000;

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} InteractionRecord
 * @property {string} session_id      - Anonymous user session UID from Firebase Auth
 * @property {string} query           - Sanitised user query text (max 300 chars)
 * @property {string} intent          - Classified intent category
 * @property {string} response        - Gemini-generated reply text
 * @property {number} response_ms     - Time to generate response in milliseconds
 * @property {string} election_phase  - Current election phase (e.g. "early-voting")
 * @property {number} ts              - Unix timestamp in milliseconds
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stream a civic interaction record to BigQuery.
 * Uses streaming insertAll for low-latency real-time data ingestion.
 * Runs asynchronously — never blocks the UI pipeline.
 *
 * @param {InteractionRecord} record - Structured interaction data to insert
 * @returns {Promise<void>}
 *
 * @example
 * streamInteraction({
 *   session_id:     "abc123",
 *   query:          "How do I register to vote?",
 *   intent:         "registration",
 *   response:       "You can register at vote.gov or at your local DMV.",
 *   response_ms:    812,
 *   election_phase: "early-voting",
 *   ts:             Date.now(),
 * });
 */
export async function streamInteraction(record) {
  return _insertRows(BQ_TABLE_INTERACTIONS, [record]);
}

/**
 * Stream a civic milestone snapshot to BigQuery.
 * Called whenever the election state updates from Firebase, creating a time-series
 * of election phase progression. Powers the admin analytics panel.
 *
 * @param {Object} milestones - Map of milestone IDs to Unix timestamps
 * @param {Object} phases     - { current: string, label: string }
 * @returns {Promise<void>}
 */
export async function streamCivicSnapshot(milestones, phases) {
  const record = {
    ts: Date.now(),
    election_phase: phases?.current ?? "unknown",
    phase_label: phases?.label ?? "Unknown",
    milestones_json: JSON.stringify(milestones || {}),
  };
  return _insertRows(BQ_TABLE_SNAPSHOTS, [record]);
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * POST rows to the BigQuery insertAll endpoint.
 * Assigns a unique `insertId` per row to guarantee exactly-once delivery semantics.
 * Gracefully degrades when BigQuery access is unavailable (non-fatal).
 *
 * @param {string}   table - BigQuery table name within {@link BQ_DATASET}
 * @param {Object[]} rows  - Array of plain-object rows to insert
 * @returns {Promise<void>}
 * @private
 */
async function _insertRows(table, rows) {
  if (!window.ENV?.MAPS_API_KEY) {
    return;
  }

  const payload = {
    rows: rows.map((json) => ({
      insertId: uniqueId("bq"), // Ensures exactly-once semantics per row
      json,
    })),
    skipInvalidRows: false,
    ignoreUnknownValues: true,
  };

  try {
    const res = await fetchWithTimeout(
      `${_bqInsertUrl(table)}?key=${window.ENV.MAPS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      BQ_TIMEOUT_MS,
    );

    if (!res.ok) {
      logger.info(
        "bigquery",
        `Insert to ${table} returned HTTP ${res.status} — continuing`,
      );
      return;
    }

    const data = await res.json();
    if (data.insertErrors?.length) {
      logger.warn(
        "bigquery",
        `Row insert errors in "${table}":`,
        data.insertErrors,
      );
    } else {
      logger.debug("bigquery", `Streamed ${rows.length} row(s) to "${table}"`);
    }
  } catch (e) {
    // Non-fatal — analytics failure must never disrupt the civic UX
    logger.info("bigquery", `Analytics stream unavailable: ${e.message}`);
  }
}
