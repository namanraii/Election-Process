/**
 * @file ui.test.js
 * @description Unit tests for the UI rendering module (ui.js).
 * Tests DOM manipulation, ARIA attribute management, and chat message rendering.
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";

const {
  appendMessage,
  updateBotMessage,
  showAlertBanner,
  hideAlertBanner,
  updateElectionStatus,
  consumeInput,
} = await import("../js/ui.js");

describe("ui.js — DOM rendering", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="messages"></div>
      <div id="alert-banner" hidden>
        <span id="alert-text"></span>
      </div>
      <p id="game-status">Connecting…</p>
      <input id="user-input" value="" />
    `;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- appendMessage tests ---
  test("appendMessage creates a user message bubble", () => {
    const el = appendMessage("Hello", "user");
    expect(el.textContent).toBe("Hello");
    expect(el.className).toContain("msg--user");
  });

  test("appendMessage creates a bot message bubble with ARIA attributes", () => {
    const el = appendMessage("I can help!", "bot");
    expect(el.textContent).toBe("I can help!");
    expect(el.className).toContain("msg--bot");
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(el.getAttribute("aria-atomic")).toBe("true");
    expect(el.getAttribute("aria-label")).toBe("ElectionIQ says: I can help!");
  });

  test("appendMessage creates proactive bot message with assertive ARIA", () => {
    const el = appendMessage("Alert!", "bot", true);
    expect(el.className).toContain("msg--proactive");
    expect(el.getAttribute("role")).toBe("alert");
    expect(el.getAttribute("aria-live")).toBe("assertive");
  });

  test("appendMessage appends to the messages container", () => {
    appendMessage("First", "user");
    appendMessage("Second", "bot");
    const messages = document.getElementById("messages");
    expect(messages.children.length).toBe(2);
  });

  test("appendMessage returns a div even when #messages is missing", () => {
    document.body.innerHTML = "";
    const el = appendMessage("Fallback", "bot");
    expect(el.tagName).toBe("DIV");
  });

  // --- updateBotMessage tests ---
  test("updateBotMessage updates text and ARIA label", () => {
    const el = appendMessage("…", "bot");
    updateBotMessage(el, "Here is your answer");
    expect(el.textContent).toBe("Here is your answer");
    expect(el.getAttribute("aria-label")).toBe(
      "ElectionIQ says: Here is your answer",
    );
  });

  test("updateBotMessage handles null element gracefully", () => {
    expect(() => updateBotMessage(null, "text")).not.toThrow();
  });

  // --- showAlertBanner / hideAlertBanner tests ---
  test("showAlertBanner reveals the banner and sets text", () => {
    showAlertBanner("Registration closing soon!");
    const banner = document.getElementById("alert-banner");
    const text = document.getElementById("alert-text");
    expect(banner.hidden).toBe(false);
    expect(text.textContent).toBe("Registration closing soon!");
  });

  test("showAlertBanner auto-hides after the specified duration", () => {
    showAlertBanner("Temporary alert", 5000);
    const banner = document.getElementById("alert-banner");
    expect(banner.hidden).toBe(false);
    jest.advanceTimersByTime(5000);
    expect(banner.hidden).toBe(true);
  });

  test("hideAlertBanner hides the banner immediately", () => {
    showAlertBanner("Visible alert");
    hideAlertBanner();
    expect(document.getElementById("alert-banner").hidden).toBe(true);
  });

  test("hideAlertBanner is safe when banner element is missing", () => {
    document.body.innerHTML = "";
    expect(() => hideAlertBanner()).not.toThrow();
  });

  // --- updateElectionStatus tests ---
  test("updateElectionStatus updates status text", () => {
    updateElectionStatus("Early Voting Period");
    expect(document.getElementById("game-status").textContent).toBe(
      "Early Voting Period",
    );
  });

  test("updateElectionStatus handles missing element", () => {
    document.body.innerHTML = "";
    expect(() => updateElectionStatus("Test")).not.toThrow();
  });

  // --- consumeInput tests ---
  test("consumeInput reads and clears the input field", () => {
    document.getElementById("user-input").value = "  How do I vote?  ";
    const val = consumeInput();
    expect(val).toBe("How do I vote?");
    expect(document.getElementById("user-input").value).toBe("");
  });

  test("consumeInput returns empty string for empty input", () => {
    document.getElementById("user-input").value = "   ";
    expect(consumeInput()).toBe("");
  });

  test("consumeInput returns empty string when input element is missing", () => {
    document.body.innerHTML = "";
    expect(consumeInput()).toBe("");
  });
});
