import { describe, it, expect } from "vitest";
import { normalizeGitUrl, hashRemoteUrl, getRepoIdentifier } from "./repo-hash.js";

describe("normalizeGitUrl", () => {
  it("normalizes SSH URLs", () => {
    expect(normalizeGitUrl("git@github.com:user/repo.git")).toBe("github.com/user/repo");
    expect(normalizeGitUrl("git@github.com:user/repo")).toBe("github.com/user/repo");
  });

  it("normalizes HTTPS URLs", () => {
    expect(normalizeGitUrl("https://github.com/user/repo.git")).toBe("github.com/user/repo");
    expect(normalizeGitUrl("https://github.com/user/repo")).toBe("github.com/user/repo");
    expect(normalizeGitUrl("http://github.com/user/repo.git")).toBe("github.com/user/repo");
  });

  it("normalizes ssh:// URLs", () => {
    expect(normalizeGitUrl("ssh://git@github.com/user/repo.git")).toBe("github.com/user/repo");
  });

  it("handles trailing slashes", () => {
    expect(normalizeGitUrl("https://github.com/user/repo/")).toBe("github.com/user/repo");
  });

  it("lowercases the URL", () => {
    expect(normalizeGitUrl("https://GitHub.com/User/Repo.git")).toBe("github.com/user/repo");
  });

  it("handles whitespace", () => {
    expect(normalizeGitUrl("  https://github.com/user/repo.git  ")).toBe("github.com/user/repo");
  });
});

describe("hashRemoteUrl", () => {
  it("returns consistent hash for same URL", () => {
    const hash1 = hashRemoteUrl("https://github.com/user/repo.git");
    const hash2 = hashRemoteUrl("https://github.com/user/repo.git");
    expect(hash1).toBe(hash2);
  });

  it("returns same hash for equivalent URLs", () => {
    const sshHash = hashRemoteUrl("git@github.com:user/repo.git");
    const httpsHash = hashRemoteUrl("https://github.com/user/repo.git");
    expect(sshHash).toBe(httpsHash);
  });

  it("returns 8 character hash", () => {
    const hash = hashRemoteUrl("https://github.com/user/repo.git");
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("returns different hashes for different repos", () => {
    const hash1 = hashRemoteUrl("https://github.com/user/repo1.git");
    const hash2 = hashRemoteUrl("https://github.com/user/repo2.git");
    expect(hash1).not.toBe(hash2);
  });
});

describe("getRepoIdentifier", () => {
  it("returns hash and normalized URL", () => {
    const identifier = getRepoIdentifier("git@github.com:user/repo.git");
    expect(identifier.hash).toHaveLength(8);
    expect(identifier.normalizedUrl).toBe("github.com/user/repo");
    expect(identifier.originalUrl).toBe("git@github.com:user/repo.git");
  });
});
