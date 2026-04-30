/**
 * maps.js
 * @module maps
 * @description Google Maps JavaScript API integration for ElectionIQ.
 * Renders a map panel that shows nearby polling stations when the user
 * triggers a "location" intent (e.g. "Find my polling place", "Where do I vote?").
 *
 * Behaviour:
 *  - Geocodes the user's browser location via the Geolocation API
 *  - Performs a Places API text search for nearby polling stations
 *  - Renders clickable markers with Open/Early/Closed status overlays
 *  - Focuses the map to the nearest result
 *  - This panel replaces the timeline widget only for location queries
 *
 * Google Services used:
 *  - Maps JavaScript API (maps.googleapis.com) — basemap + marker rendering
 *  - Places API (included in Maps JS API) — polling station search
 *
 * @see https://developers.google.com/maps/documentation/javascript
 * @see https://developers.google.com/maps/documentation/javascript/places
 */

import { logger } from "./logger.js";

/** @type {google.maps.Map|null} Singleton map instance (lazy-initialised on first location query) */
let _map = null;

/** @type {boolean} Tracks whether initMap() has been called */
let _mapInitialised = false;

/**
 * @typedef {Object} PollingStation
 * @property {string}                      name       - Display name of the station
 * @property {{ lat: number, lng: number }} location   - Lat/lng position
 * @property {string}                      status     - "open" | "early" | "closed"
 */

/**
 * Polling station status colour map for marker overlays.
 * @constant {{ open: string, early: string, closed: string }}
 */
const STATUS_COLOURS = {
  open:   "#22c55e",  // green
  early:  "#f59e0b",  // amber
  closed: "#ef4444",  // red
};

/** @constant {number} Default map zoom level for polling station view */
const DEFAULT_ZOOM = 14;

/** @constant {number} Maximum number of polling station markers to show */
const MAX_MARKERS = 5;

/**
 * Initialise the Google Maps satellite view (lazy — only called on first location query).
 * Attempts to geolocate the user; falls back to a default position if denied.
 * Renders nearby polling station markers once the map is ready.
 *
 * @returns {void}
 */
export function initMap() {
  if (_mapInitialised) {return;} // Guard against repeated initialisation
  _mapInitialised = true;

  const mapEl = document.getElementById("map");
  if (!mapEl) {return;}

  const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco

  _map = new google.maps.Map(mapEl, {
    center:           defaultCenter,
    zoom:             DEFAULT_ZOOM,
    mapTypeId:        "roadmap",
    zoomControl:      true,
    mapTypeControl:   false,
    streetViewControl: false,
  });

  // Request geolocation — non-blocking, updates map if granted
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        _map.setCenter(userPos);
        _findPollingStations(userPos);
      },
      err => {
        logger.warn("maps", "Geolocation denied:", err.message);
        _findPollingStations(defaultCenter);
      }
    );
  } else {
    _findPollingStations(defaultCenter);
  }
}

/**
 * Search for nearby polling stations using the Places text search API
 * and render markers on the map with status colour overlays.
 *
 * @param {{ lat: number, lng: number }} center - The search centre point
 * @returns {void}
 * @private
 */
function _findPollingStations(center) {
  if (!_map) {return;}

  const service = new google.maps.places.PlacesService(_map);
  service.textSearch(
    {
      query:    "polling station voting location",
      location: center,
      radius:   5000,
    },
    (results, serviceStatus) => {
      if (serviceStatus !== google.maps.places.PlacesServiceStatus.OK || !results) {
        logger.warn("maps", "Places search returned status:", serviceStatus);
        return;
      }

      results.slice(0, MAX_MARKERS).forEach((place, i) => {
        const location = place.geometry?.location;
        if (!location) {return;}

        // Alternate status for demonstration purposes (real app would use a live data API)
        const statusKeys = ["open", "early", "closed"];
        const status = statusKeys[i % statusKeys.length];

        _addPollingMarker({
          name:     place.name,
          location: { lat: location.lat(), lng: location.lng() },
          status,
        });
      });
    }
  );
}

/**
 * Add a single polling station marker to the map.
 *
 * @param {PollingStation} station - Station data to render
 * @returns {void}
 * @private
 */
function _addPollingMarker(station) {
  if (!_map) {return;}

  const marker = new google.maps.Marker({
    position: station.location,
    map:      _map,
    title:    `${station.name} (${station.status})`,
    icon: {
      path:        google.maps.SymbolPath.CIRCLE,
      scale:       10,
      fillColor:   STATUS_COLOURS[station.status] || STATUS_COLOURS.closed,
      fillOpacity: 0.9,
      strokeColor: "#fff",
      strokeWeight: 1.5,
    },
  });

  const infoWindow = new google.maps.InfoWindow({
    content: `<strong>${station.name}</strong><br>Status: ${station.status}`,
  });

  marker.addListener("click", () => {
    infoWindow.open(_map, marker);
  });
}

/**
 * Smoothly pan the map to a specific geographic location and zoom in.
 * Called externally to focus on a known polling station coordinates.
 *
 * @param {number} lat          - Target latitude
 * @param {number} lng          - Target longitude
 * @param {number} [zoom=16]    - Optional zoom level override
 * @returns {void}
 */
export function focusLocation(lat, lng, zoom = 16) {
  if (!_map) {return;}
  _map.panTo({ lat, lng });
  _map.setZoom(zoom);
}
