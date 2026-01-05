import { describe, it, expect } from "vitest";
import {
  pickAgentNames,
  getRandomAgentNames,
  isValidAgentName,
  getAllAgentNames,
} from "./names.js";

describe("getRandomAgentNames", () => {
  it("returns the requested number of names", () => {
    const names = getRandomAgentNames(3);
    expect(names).toHaveLength(3);
  });

  it("returns unique names", () => {
    const names = getRandomAgentNames(5);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(5);
  });

  it("returns at most the requested count", () => {
    const names = getRandomAgentNames(10);
    expect(names.length).toBeLessThanOrEqual(10);
  });
});

describe("isValidAgentName", () => {
  it("returns true for valid agent names", () => {
    expect(isValidAgentName("alice")).toBe(true);
    expect(isValidAgentName("betty")).toBe(true);
    expect(isValidAgentName("felix")).toBe(true);
  });

  it("returns false for invalid names", () => {
    expect(isValidAgentName("notaname")).toBe(false);
    expect(isValidAgentName("agent1")).toBe(false);
    expect(isValidAgentName("")).toBe(false);
  });
});

describe("getAllAgentNames", () => {
  it("returns all available agent names", () => {
    const names = getAllAgentNames();
    expect(names.length).toBeGreaterThan(40);
    expect(names).toContain("alice");
    expect(names).toContain("zara");
  });
});

describe("pickAgentNames", () => {
  it("returns the requested number of names", async () => {
    // Use a non-existent repo hash so no existing agents are found
    const names = await pickAgentNames(3, "nonexistent");
    expect(names).toHaveLength(3);
  });

  it("returns unique names", async () => {
    const names = await pickAgentNames(5, "nonexistent");
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(5);
  });
});
