/**
 * intent.test.js
 * @description Unit tests for the ElectionIQ civic intent classifier.
 * Tests all 7 intent categories plus the general fallback.
 * Each category covers multiple phrasings to validate regex robustness.
 */

import { classifyIntent, classifyIntentAll } from "../js/intent.js";

describe("intent classification — single intent", () => {
  // ---- registration -------------------------------------------------------
  test("classifies 'register' keyword → registration", () => {
    expect(classifyIntent("how do i register to vote?")).toBe("registration");
  });
  test("classifies 'eligible' keyword → registration", () => {
    expect(classifyIntent("am i eligible to vote?")).toBe("registration");
  });
  test("classifies 'voter id' keyword → registration", () => {
    expect(classifyIntent("voter id required?")).toBe("registration");
  });
  test("classifies 'sign up' keyword → registration", () => {
    expect(classifyIntent("sign up to vote today")).toBe("registration");
  });
  test("classifies 'enroll' keyword → registration", () => {
    expect(classifyIntent("enroll in voter registration")).toBe("registration");
  });

  // ---- location -----------------------------------------------------------
  test("classifies 'where' keyword → location", () => {
    expect(classifyIntent("where is my polling place?")).toBe("location");
  });
  test("classifies 'polling place' keyword → location", () => {
    expect(classifyIntent("find my polling place")).toBe("location");
  });
  test("classifies 'near me' keyword → location", () => {
    expect(classifyIntent("voting center near me")).toBe("location");
  });
  test("classifies 'directions' keyword → location", () => {
    expect(classifyIntent("directions to polling station")).toBe("location");
  });
  test("classifies 'address' keyword → location", () => {
    expect(classifyIntent("address of my voting location")).toBe("location");
  });

  // ---- voting -------------------------------------------------------------
  test("classifies 'ballot' keyword → voting", () => {
    expect(classifyIntent("how to drop my ballot?")).toBe("voting");
  });
  test("classifies 'mail in' keyword → voting", () => {
    expect(classifyIntent("mail in voting info")).toBe("voting");
  });
  test("classifies 'absentee' keyword → voting", () => {
    expect(classifyIntent("absentee ballot application")).toBe("voting");
  });
  test("classifies 'drop box' keyword → voting", () => {
    expect(classifyIntent("nearest ballot drop box")).toBe("voting");
  });

  // ---- process ------------------------------------------------------------
  test("classifies 'explain' keyword → process", () => {
    expect(classifyIntent("explain the election process")).toBe("process");
  });
  test("classifies 'what happens' keyword → process", () => {
    expect(classifyIntent("what happens after election day?")).toBe("process");
  });
  test("classifies 'timeline' keyword → process", () => {
    expect(classifyIntent("election timeline")).toBe("process");
  });
  test("classifies 'steps' keyword → process", () => {
    expect(classifyIntent("what are the steps to vote?")).toBe("process");
  });

  // ---- results ------------------------------------------------------------
  test("classifies 'count' keyword → results", () => {
    expect(classifyIntent("how are votes counted?")).toBe("results");
  });
  test("classifies 'winner' keyword → results", () => {
    expect(classifyIntent("when will the winner be announced?")).toBe(
      "results",
    );
  });
  test("classifies 'certif' keyword → results", () => {
    expect(classifyIntent("when is certification?")).toBe("results");
  });
  test("classifies 'recount' keyword → results", () => {
    expect(classifyIntent("how does a recount work?")).toBe("results");
  });

  // ---- glossary -----------------------------------------------------------
  test("classifies 'what is' keyword → glossary", () => {
    expect(classifyIntent("what is a precinct?")).toBe("glossary");
  });
  test("classifies 'electoral college' keyword → glossary", () => {
    expect(classifyIntent("explain the electoral college")).toBe("glossary");
  });
  test("classifies 'define' keyword → glossary", () => {
    expect(classifyIntent("define caucus")).toBe("glossary");
  });
  test("classifies 'mean' keyword → glossary", () => {
    expect(classifyIntent("what does precinct mean?")).toBe("glossary");
  });

  // ---- id -----------------------------------------------------------------
  test("classifies 'identification' keyword → id", () => {
    expect(classifyIntent("what identification do i need to vote?")).toBe("id");
  });
  test("classifies 'bring' keyword → id", () => {
    expect(classifyIntent("what to bring to the polls")).toBe("id");
  });
  test("classifies 'document' keyword → id", () => {
    expect(classifyIntent("what documents do i need?")).toBe("id");
  });

  // ---- general fallback ---------------------------------------------------
  test("returns 'general' for unmatched input", () => {
    expect(classifyIntent("hello there")).toBe("general");
  });
  test("returns 'general' for empty string", () => {
    expect(classifyIntent("")).toBe("general");
  });
  test("returns 'general' for non-string input", () => {
    expect(classifyIntent(null)).toBe("general");
    expect(classifyIntent(undefined)).toBe("general");
    expect(classifyIntent(42)).toBe("general");
  });
  test("returns 'general' for unrelated topic", () => {
    expect(classifyIntent("i love pizza")).toBe("general");
  });
});

describe("intent classification — multi-intent", () => {
  test("classifyIntentAll returns multiple matching intents", () => {
    const intents = classifyIntentAll(
      "explain what happens after you register to vote",
    );
    expect(intents).toContain("registration");
    expect(intents).toContain("process");
  });

  test("classifyIntentAll returns empty array for no match", () => {
    expect(classifyIntentAll("hello world")).toEqual([]);
  });

  test("classifyIntentAll returns empty array for empty string", () => {
    expect(classifyIntentAll("")).toEqual([]);
  });

  test("classifyIntentAll returns empty array for non-string", () => {
    expect(classifyIntentAll(null)).toEqual([]);
  });
});
