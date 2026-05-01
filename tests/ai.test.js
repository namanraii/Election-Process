/**
 * @file ai.test.js
 * @description Unit tests for the AI pipeline router module (ai.js).
 * Tests the two-tier routing strategy: Cloud Function (Tier 1) → Gemini fallback (Tier 2).
 */

import { jest } from "@jest/globals";

// --- Mock dependencies ---
const mockAskGemini = jest.fn().mockResolvedValue("Gemini fallback reply");
const mockFetchWithTimeout = jest.fn();
const mockStartTrace = jest.fn(() => jest.fn());
const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };

jest.unstable_mockModule("../js/gemini.js", () => ({
  askGemini: mockAskGemini,
}));

jest.unstable_mockModule("../js/utils.js", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}));

jest.unstable_mockModule("../js/perf.js", () => ({
  startTrace: mockStartTrace,
}));

jest.unstable_mockModule("../js/logger.js", () => ({
  logger: mockLogger,
}));

const { routeAIQuery, resetCFHealth } = await import("../js/ai.js");

describe("ai.js — routeAIQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCFHealth(); // Reset the CF health flag before each test
    globalThis.window = { _uid: "test-uid-123" };
  });

  test("falls back to Gemini when CF returns non-OK status", async () => {
    mockFetchWithTimeout.mockResolvedValue({ ok: false, status: 500 });

    const result = await routeAIQuery("Test query", {}, "general");
    expect(result).toBe("Gemini fallback reply");
    expect(mockAskGemini).toHaveBeenCalledTimes(1);
  });

  test("falls back to Gemini when CF throws a network error", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network failure"));

    const result = await routeAIQuery("Test query", {}, "general");
    expect(result).toBe("Gemini fallback reply");
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  test("falls back to Gemini on AbortError (timeout)", async () => {
    const abortError = new Error("Timeout");
    abortError.name = "AbortError";
    mockFetchWithTimeout.mockRejectedValue(abortError);

    const result = await routeAIQuery("Test", {}, "general");
    expect(result).toBe("Gemini fallback reply");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "ai",
      "Cloud Function timeout — using direct Gemini"
    );
  });

  test("marks CF unhealthy after non-abort error, skips CF on next call", async () => {
    // First call — CF fails with a server error
    mockFetchWithTimeout.mockRejectedValue(new Error("Server error"));
    await routeAIQuery("Test", {}, "general");

    // CF is now marked unhealthy — next call should skip CF entirely
    mockFetchWithTimeout.mockClear();
    mockAskGemini.mockClear();
    await routeAIQuery("Test again", {}, "general");
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    expect(mockAskGemini).toHaveBeenCalledTimes(1);
  });

  test("starts a performance trace on CF call attempt", async () => {
    const mockStop = jest.fn();
    mockStartTrace.mockReturnValue(mockStop);
    mockFetchWithTimeout.mockResolvedValue({ ok: false, status: 503 });

    await routeAIQuery("Test", {}, "general");
    expect(mockStartTrace).toHaveBeenCalledWith("cloud_function_response");
    expect(mockStop).toHaveBeenCalled();
  });

  test("resetCFHealth is a function", () => {
    expect(typeof resetCFHealth).toBe("function");
  });

  test("passes context to Gemini fallback on CF failure", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("fail"));
    const ctx = { phases: { current: "early-voting" } };

    await routeAIQuery("Where do I vote?", ctx, "location");
    expect(mockAskGemini).toHaveBeenCalledWith("Where do I vote?", ctx);
  });

  test("askGemini is called with the user message and context on fallback", async () => {
    mockFetchWithTimeout.mockResolvedValue({ ok: false, status: 500 });

    const context = { milestones: { electionDay: 1234567890 } };
    await routeAIQuery("When is election day?", context, "process");
    expect(mockAskGemini).toHaveBeenCalledWith("When is election day?", context);
  });
});
