/**
 * ui.js
 * @module ui
 * @description DOM rendering and UI state management for ElectionIQ chat interface.
 * Separates all view concerns from app.js business logic.
 * All direct DOM mutations go through this module — no other module touches the DOM.
 *
 * Responsibilities:
 *  - Chat message rendering (user + bot bubbles)
 *  - Proactive civic alert banner show/hide
 *  - Election status bar text updates
 *  - Input field state management (atomic read + clear)
 *
 * Accessibility notes:
 *  - Bot messages carry role="status" aria-live="polite" for screen readers
 *  - Proactive alerts carry role="alert" aria-live="assertive"
 *  - All DOM elements accessed by ID to decouple from structure
 */

/** @constant {string} CSS BEM block name for message bubbles */
const MSG_CLASS = "msg";

/**
 * Append a chat message bubble to the conversation log.
 * Automatically scrolls to the latest message after insertion.
 * Bot messages are announced to screen readers via ARIA live regions.
 *
 * @param {string}        text              - Message text content to display
 * @param {"bot"|"user"}  role              - Determines bubble alignment and colour
 * @param {boolean}       [isProactive=false] - Adds proactive styling + assertive live region
 * @returns {HTMLDivElement} The created message element (use ref for streaming updates)
 *
 * @example
 * const el = appendMessage("Checking registration status…", "bot");
 * // later, once Gemini replies:
 * el.textContent = "Registration closes in 3 days.";
 */
export function appendMessage(text, role, isProactive = false) {
  const log = document.getElementById("messages");
  if (!log) {
    return document.createElement("div");
  } // Safe fallback for tests

  const div = document.createElement("div");
  div.className = `${MSG_CLASS} ${MSG_CLASS}--${role}${isProactive ? ` ${MSG_CLASS}--proactive` : ""}`;
  div.textContent = text;

  if (role === "bot") {
    div.setAttribute("role", isProactive ? "alert" : "status");
    div.setAttribute("aria-live", isProactive ? "assertive" : "polite");
    div.setAttribute("aria-label", `ElectionIQ says: ${text}`);
    div.setAttribute("aria-atomic", "true");
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

/**
 * Update the bot message content and its ARIA label simultaneously.
 * Used after Gemini returns a reply to replace the "…" thinking placeholder.
 *
 * @param {HTMLDivElement} el   - Bot message element returned by {@link appendMessage}
 * @param {string}         text - Final reply text to display
 * @returns {void}
 */
export function updateBotMessage(el, text) {
  if (!el) {
    return;
  }
  el.textContent = text;
  el.setAttribute("aria-label", `ElectionIQ says: ${text}`);
}

/**
 * Show the civic alert banner with a message.
 * Auto-dismisses after `durationMs` milliseconds.
 *
 * @param {string} message            - Alert message to display
 * @param {number} [durationMs=10000] - Auto-dismiss delay in milliseconds
 * @returns {void}
 */
export function showAlertBanner(message, durationMs = 10_000) {
  const banner = document.getElementById("alert-banner");
  const textEl = document.getElementById("alert-text");
  if (!banner || !textEl) {
    return;
  }
  textEl.textContent = message;
  banner.hidden = false;
  setTimeout(() => {
    banner.hidden = true;
  }, durationMs);
}

/**
 * Hide the alert banner immediately.
 * Called by the dismiss (×) button via `dismissAlert()` in app.js.
 * @returns {void}
 */
export function hideAlertBanner() {
  const banner = document.getElementById("alert-banner");
  if (banner) {
    banner.hidden = true;
  }
}

/**
 * Update the election status text in the chat header.
 * Reflects the current election phase received from Firebase (e.g. "Early Voting Period").
 *
 * @param {string} statusText - Phase label to display (e.g. "Early Voting Period")
 * @returns {void}
 */
export function updateElectionStatus(statusText) {
  const el = document.getElementById("game-status");
  if (el) {
    el.textContent = statusText;
  }
}

/**
 * Read and clear the user input field in one atomic operation.
 * Returns an empty string and performs no DOM mutation if the element is not found.
 *
 * @returns {string} The trimmed input value before clearing
 */
export function consumeInput() {
  const input = document.getElementById("user-input");
  if (!input) {
    return "";
  }
  const val = input.value.trim();
  input.value = "";
  return val;
}
