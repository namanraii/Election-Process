/**
 * @file logger.test.js
 * @description Unit tests for the centralised structured logging module (logger.js).
 * Validates log level filtering, message formatting, and dynamic level switching.
 */

import { jest } from "@jest/globals";

// Mock window and localStorage before importing
globalThis.window = { localStorage: { getItem: () => null } };

const { logger } = await import("../js/logger.js");

describe("logger.js — structured logging", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
      info: jest.spyOn(console, "info").mockImplementation(() => {}),
      warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
    };
    logger.setLevel("DEBUG"); // Allow all levels for testing
  });

  afterEach(() => {
    jest.restoreAllMocks();
    logger.setLevel("INFO"); // Reset to default
  });

  test("debug() outputs formatted message with module tag", () => {
    logger.debug("test", "Hello debug");
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
    const msg = consoleSpy.debug.mock.calls[0][0];
    expect(msg).toContain("[ElectionIQ:");
    expect(msg).toContain("test");
    expect(msg).toContain("Hello debug");
  });

  test("info() outputs formatted message", () => {
    logger.info("firebase", "Connected");
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.info.mock.calls[0][0]).toContain("Connected");
  });

  test("warn() outputs formatted message", () => {
    logger.warn("maps", "Geo denied");
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn.mock.calls[0][0]).toContain("Geo denied");
  });

  test("error() outputs formatted message", () => {
    logger.error("app", "Pipeline error");
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error.mock.calls[0][0]).toContain("Pipeline error");
  });

  test("filters messages below the current log level", () => {
    logger.setLevel("WARN");
    logger.debug("test", "should not appear");
    logger.info("test", "should not appear");
    logger.warn("test", "should appear");
    logger.error("test", "should appear");
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
  });

  test("NONE level suppresses all output", () => {
    logger.setLevel("NONE");
    logger.debug("test", "nope");
    logger.info("test", "nope");
    logger.warn("test", "nope");
    logger.error("test", "nope");
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  test("setLevel ignores invalid level strings", () => {
    logger.setLevel("DEBUG");
    logger.setLevel("INVALID_LEVEL");
    logger.debug("test", "should still appear");
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
  });

  test("passes additional arguments to console methods", () => {
    logger.info("test", "Message", { extra: "data" }, 42);
    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining("Message"),
      { extra: "data" },
      42,
    );
  });

  test("module name is padded for alignment", () => {
    logger.info("ai", "short module name");
    const msg = consoleSpy.info.mock.calls[0][0];
    // Module name "ai" should be padded to at least 10 chars
    expect(msg).toMatch(/\[ElectionIQ:ai\s+\]/);
  });
});
