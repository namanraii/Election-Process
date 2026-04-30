/**
 * proactive.test.js
 * @description Unit tests for the ElectionIQ date-diff proactive trigger engine.
 * Tests all 5 trigger conditions plus edge cases (boundary days, empty context, null inputs).
 */

import { jest } from "@jest/globals";

jest.unstable_mockModule("../js/firebase.js", () => ({
  getLiveContext: jest.fn(() => ({})),
  initFirebase:   jest.fn(),
}));
jest.unstable_mockModule("../js/analytics.js", () => ({
  trackProactiveAlert: jest.fn(),
  trackChatMessage:    jest.fn(),
  trackPollingPlaceSearch: jest.fn(),
  initAnalytics:       jest.fn(),
}));
jest.unstable_mockModule("../js/perf.js", () => ({
  startTrace:    jest.fn(() => jest.fn()),
  recordMetric:  jest.fn(),
  initPerformance: jest.fn(),
}));
jest.unstable_mockModule("../js/gemini.js", () => ({
  askGeminiProactive: jest.fn(async () => "Test alert message"),
  askGemini:          jest.fn(async () => "Test response"),
}));
jest.unstable_mockModule("../js/logger.js", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), setLevel: jest.fn() },
}));

const { evaluateTrigger } = await import("../js/proactive.js");

const ONE_DAY = 86_400_000;
const now     = Date.now();

describe("evaluateTrigger — proactive civic alerts", () => {

  // ---- reg-closing --------------------------------------------------------
  test("fires 'reg-closing' when deadline is exactly today (0 days)", () => {
    const ctx = { milestones: { registrationDeadline: now } };
    expect(evaluateTrigger(ctx)?.key).toBe("reg-closing");
  });

  test("fires 'reg-closing' when deadline is 1 day away", () => {
    const ctx = { milestones: { registrationDeadline: now + ONE_DAY } };
    expect(evaluateTrigger(ctx)?.key).toBe("reg-closing");
  });

  test("fires 'reg-closing' when deadline is 2 days away", () => {
    const ctx = { milestones: { registrationDeadline: now + 2 * ONE_DAY } };
    expect(evaluateTrigger(ctx)?.key).toBe("reg-closing");
  });

  test("fires 'reg-closing' when deadline is 3 days away (boundary)", () => {
    const ctx = { milestones: { registrationDeadline: now + 3 * ONE_DAY } };
    expect(evaluateTrigger(ctx)?.key).toBe("reg-closing");
  });

  test("does NOT fire 'reg-closing' when deadline is 4+ days away", () => {
    const ctx = { milestones: { registrationDeadline: now + 4 * ONE_DAY } };
    const trigger = evaluateTrigger(ctx);
    expect(trigger?.key).not.toBe("reg-closing");
  });

  test("'reg-closing' reason includes days remaining", () => {
    const ctx = { milestones: { registrationDeadline: now + ONE_DAY } };
    const trigger = evaluateTrigger(ctx);
    expect(trigger?.reason).toMatch(/registration closes in/i);
  });

  // ---- early-voting-starts ------------------------------------------------
  test("fires 'early-voting-starts' when earlyVotingStart is today", () => {
    const ctx = { milestones: { earlyVotingStart: now } };
    expect(evaluateTrigger(ctx)?.key).toBe("early-voting-starts");
  });

  test("does NOT fire 'early-voting-starts' when earlyVotingStart is tomorrow", () => {
    const ctx = { milestones: { earlyVotingStart: now + ONE_DAY } };
    const trigger = evaluateTrigger(ctx);
    expect(trigger?.key).not.toBe("early-voting-starts");
  });

  // ---- election-day -------------------------------------------------------
  test("fires 'election-day' when today is election day", () => {
    const ctx = { milestones: { electionDay: now } };
    expect(evaluateTrigger(ctx)?.key).toBe("election-day");
  });

  test("does NOT fire 'election-day' when election is tomorrow", () => {
    const ctx = { milestones: { electionDay: now + ONE_DAY } };
    const trigger = evaluateTrigger(ctx);
    expect(trigger?.key).not.toBe("election-day");
  });

  // ---- results-incoming ---------------------------------------------------
  test("fires 'results-incoming' when election was yesterday", () => {
    const ctx = { milestones: { electionDay: now - ONE_DAY } };
    expect(evaluateTrigger(ctx)?.key).toBe("results-incoming");
  });

  test("does NOT fire 'results-incoming' when election was 2+ days ago", () => {
    const ctx = { milestones: { electionDay: now - 2 * ONE_DAY } };
    const trigger = evaluateTrigger(ctx);
    expect(trigger?.key).not.toBe("results-incoming");
  });

  // ---- null / empty cases ------------------------------------------------
  test("returns null when no conditions are met", () => {
    const ctx = { milestones: { registrationDeadline: now + 10 * ONE_DAY } };
    expect(evaluateTrigger(ctx)).toBeNull();
  });

  test("returns null for empty context", () => {
    expect(evaluateTrigger({})).toBeNull();
  });

  test("returns null for null input gracefully", () => {
    expect(evaluateTrigger({ milestones: null })).toBeNull();
  });

  test("returns null when milestones are undefined", () => {
    expect(evaluateTrigger({ milestones: {} })).toBeNull();
  });
});
