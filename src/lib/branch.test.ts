import { describe, it, expect } from "vitest";
import { slugify, inferBranchType, generateBranchName, generateAgentBranchName } from "./branch.js";

describe("slugify", () => {
  it("converts text to lowercase", () => {
    expect(slugify("Fix Auth Bug")).toBe("fix-auth-bug");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("fix the bug")).toBe("fix-the-bug");
  });

  it("removes special characters", () => {
    expect(slugify("Fix bug!")).toBe("fix-bug");
    expect(slugify("Add feature (new)")).toBe("add-feature-new");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("fix--the---bug")).toBe("fix-the-bug");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-fix bug-")).toBe("fix-bug");
  });

  it("limits length to 30 characters", () => {
    const longText = "this is a very long description that should be truncated";
    expect(slugify(longText).length).toBeLessThanOrEqual(30);
  });
});

describe("inferBranchType", () => {
  it("infers fix for bug-related tasks", () => {
    expect(inferBranchType("fix the login bug")).toBe("fix");
    expect(inferBranchType("Fix authentication issue")).toBe("fix");
    expect(inferBranchType("resolve the bug in checkout")).toBe("fix");
  });

  it("infers test for testing tasks", () => {
    expect(inferBranchType("write tests for auth")).toBe("test");
    expect(inferBranchType("add unit tests")).toBe("test");
    expect(inferBranchType("create spec file")).toBe("test");
  });

  it("infers refactor for refactoring tasks", () => {
    expect(inferBranchType("refactor the API layer")).toBe("refactor");
    expect(inferBranchType("cleanup old code")).toBe("refactor");
  });

  it("infers docs for documentation tasks", () => {
    expect(inferBranchType("update documentation")).toBe("docs");
    expect(inferBranchType("add README")).toBe("docs");
    expect(inferBranchType("add jsdoc comments")).toBe("docs");
  });

  it("infers chore for maintenance tasks", () => {
    expect(inferBranchType("bump dependencies")).toBe("chore");
    expect(inferBranchType("upgrade packages")).toBe("chore");
    expect(inferBranchType("chore: update config")).toBe("chore");
    expect(inferBranchType("update deps")).toBe("chore");
  });

  it("defaults to feat for new features", () => {
    expect(inferBranchType("add user authentication")).toBe("feat");
    expect(inferBranchType("implement dark mode")).toBe("feat");
  });
});

describe("generateBranchName", () => {
  it("generates branch name with type and description", () => {
    const name = generateBranchName({
      type: "feat",
      agentName: "alice",
      description: "add auth",
    });
    expect(name).toBe("feat/alice-add-auth");
  });

  it("uses work suffix when no description provided", () => {
    const name = generateBranchName({
      type: "feat",
      agentName: "alice",
    });
    expect(name).toBe("feat/alice-work");
  });

  it("slugifies the description", () => {
    const name = generateBranchName({
      type: "fix",
      agentName: "betty",
      description: "Fix the Login Bug!",
    });
    expect(name).toBe("fix/betty-fix-the-login-bug");
  });
});

describe("generateAgentBranchName", () => {
  it("generates branch name with inferred type", () => {
    const name = generateAgentBranchName("alice", "fix the auth bug");
    expect(name).toBe("fix/alice-fix-the-auth-bug");
  });

  it("defaults to feat/agent-work when no task", () => {
    const name = generateAgentBranchName("alice");
    expect(name).toBe("feat/alice-work");
  });

  it("infers correct type from task description", () => {
    expect(generateAgentBranchName("alice", "add new feature")).toMatch(/^feat\//);
    expect(generateAgentBranchName("betty", "write tests")).toMatch(/^test\//);
    expect(generateAgentBranchName("clara", "update docs")).toMatch(/^docs\//);
  });
});
