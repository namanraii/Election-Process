/**
 * routes.js
 * @module routes
 * @description Google Routes API v2 integration for ElectionIQ.
 * Computes walking and driving routes from the user's location to their
 * nearest polling station. Route summaries are injected into Gemini's
 * context for natural-language directions.
 *
 * Example narration: "Greenwood Community Center is a 12-minute walk via Oak St."
 *
 * Google Services used:
 *  - Routes API v2 (routes.googleapis.com) — pedestrian route computation
 *
 * @see https://developers.google.com/maps/documentation/routes
 */

import { fetchWithTimeout } from "./utils.js";
import { logger }           from "./logger.js";

/** @constant {string} Routes API v2 computeRoutes endpoint */
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** @constant {number} Request timeout in milliseconds */
const TIMEOUT_MS = 8_000;

/**
 * @typedef {Object} RouteResult
 * @property {string} summary     - Human-readable summary (e.g. "850m walk — about 11 min")
 * @property {string} narration   - Gemini-ready narration (e.g. "Your polling station is an 11-minute walk.")
 * @property {number} distanceM   - Raw distance in metres
 * @property {number} durationSec - Raw duration in seconds
 */

/**
 * Compute a walking route from user's location to a polling station.
 * Uses Routes API v2 with WALK travel mode and highway avoidance
 * for accurate pedestrian navigation results.
 *
 * @param {{ lat: number, lng: number }} origin      - Starting point (user location)
 * @param {{ lat: number, lng: number }} destination - Polling station location
 * @returns {Promise<RouteResult>} Route details including human-readable summary
 * @throws {Error} If the API responds with an error or returns no valid route
 *
 * @example
 * const route = await computeRoute(
 *   { lat: 37.7749, lng: -122.4194 },
 *   { lat: 37.7800, lng: -122.4100 }
 * );
 * console.log(route.narration);
 * // → "Your polling station is a 14-minute walk away."
 */
export async function computeRoute(origin, destination) {
  const body = {
    origin:      { location: { latLng: origin } },
    destination: { location: { latLng: destination } },
    travelMode:  "WALK",
    computeAlternativeRoutes: false,
    routeModifiers: { avoidHighways: true },
  };

  let data;
  try {
    const res = await fetchWithTimeout(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-Goog-Api-Key":  window.ENV.ROUTES_API_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction",
      },
      body: JSON.stringify(body),
    }, TIMEOUT_MS);

    if (!res.ok) {throw new Error(`Routes API error HTTP ${res.status}`);}
    data = await res.json();
  } catch (e) {
    logger.warn("routes", "Route computation failed:", e.message);
    throw new Error(`Routes API failed: ${e.message}`);
  }

  const route = data.routes?.[0];
  if (!route) {throw new Error("Routes API returned no valid route");}

  const distM   = route.distanceMeters ?? 0;
  const durSec  = parseInt(route.duration, 10) || 0;
  const durMin  = Math.round(durSec / 60);

  return {
    summary:     `${Math.round(distM)}m walk — about ${durMin} min`,
    narration:   `Your polling station is a ${durMin}-minute walk away.`,
    distanceM:   distM,
    durationSec: durSec,
  };
}
