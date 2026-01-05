import { describe, it, expect } from "vitest";
import { homedir } from "os";
import { join } from "path";
import {
  getClaudectlRoot,
  getReposDir,
  getRepoPath,
  getBareRepoPath,
  getWorktreesDir,
  getWorktreePath,
  getQueuesDir,
  getQueuePath,
  getIpcDir,
  getRepoIpcDir,
} from "./paths.js";

describe("paths", () => {
  const home = homedir();
  const root = join(home, ".claudectl");

  describe("getClaudectlRoot", () => {
    it("returns ~/.claudectl", () => {
      expect(getClaudectlRoot()).toBe(root);
    });
  });

  describe("getReposDir", () => {
    it("returns ~/.claudectl/repos", () => {
      expect(getReposDir()).toBe(join(root, "repos"));
    });
  });

  describe("getRepoPath", () => {
    it("returns ~/.claudectl/repos/<hash>", () => {
      expect(getRepoPath("abc123")).toBe(join(root, "repos", "abc123"));
    });
  });

  describe("getBareRepoPath", () => {
    it("returns ~/.claudectl/repos/<hash>/bare", () => {
      expect(getBareRepoPath("abc123")).toBe(join(root, "repos", "abc123", "bare"));
    });
  });

  describe("getWorktreesDir", () => {
    it("returns ~/.claudectl/repos/<hash>/worktrees", () => {
      expect(getWorktreesDir("abc123")).toBe(join(root, "repos", "abc123", "worktrees"));
    });
  });

  describe("getWorktreePath", () => {
    it("returns ~/.claudectl/repos/<hash>/worktrees/<name>", () => {
      expect(getWorktreePath("abc123", "alice")).toBe(
        join(root, "repos", "abc123", "worktrees", "alice")
      );
    });
  });

  describe("getQueuesDir", () => {
    it("returns ~/.claudectl/queues", () => {
      expect(getQueuesDir()).toBe(join(root, "queues"));
    });
  });

  describe("getQueuePath", () => {
    it("returns ~/.claudectl/queues/<hash>.json", () => {
      expect(getQueuePath("abc123")).toBe(join(root, "queues", "abc123.json"));
    });
  });

  describe("getIpcDir", () => {
    it("returns ~/.claudectl/ipc", () => {
      expect(getIpcDir()).toBe(join(root, "ipc"));
    });
  });

  describe("getRepoIpcDir", () => {
    it("returns ~/.claudectl/ipc/<hash>", () => {
      expect(getRepoIpcDir("abc123")).toBe(join(root, "ipc", "abc123"));
    });
  });
});
