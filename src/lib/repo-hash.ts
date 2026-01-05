import { createHash } from "crypto";

/**
 * Normalize a git URL to a canonical form for consistent hashing.
 * Handles SSH, HTTPS, and various URL formats.
 *
 * Examples:
 *   git@github.com:user/repo.git -> github.com/user/repo
 *   https://github.com/user/repo.git -> github.com/user/repo
 *   https://github.com/user/repo -> github.com/user/repo
 *   ssh://git@github.com/user/repo.git -> github.com/user/repo
 */
export function normalizeGitUrl(url: string): string {
  let normalized = url.trim();

  // Remove .git suffix
  normalized = normalized.replace(/\.git$/, "");

  // Handle SSH format: git@host:path -> host/path
  normalized = normalized.replace(/^git@([^:]+):(.*)$/, "$1/$2");

  // Handle ssh:// format: ssh://git@host/path -> host/path
  normalized = normalized.replace(/^ssh:\/\/git@([^/]+)\/(.*)$/, "$1/$2");

  // Remove https:// or http://
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove any trailing slashes
  normalized = normalized.replace(/\/+$/, "");

  // Lowercase for consistency
  return normalized.toLowerCase();
}

/**
 * Generate a short hash from a git remote URL.
 * Returns the first 8 characters of SHA256 hash.
 */
export function hashRemoteUrl(url: string): string {
  const normalized = normalizeGitUrl(url);
  const hash = createHash("sha256").update(normalized).digest("hex");
  return hash.slice(0, 8);
}

/**
 * Repository identifier containing both the hash and normalized URL.
 */
export interface RepoIdentifier {
  hash: string;
  normalizedUrl: string;
  originalUrl: string;
}

/**
 * Get full repository identifier from a remote URL.
 */
export function getRepoIdentifier(remoteUrl: string): RepoIdentifier {
  return {
    hash: hashRemoteUrl(remoteUrl),
    normalizedUrl: normalizeGitUrl(remoteUrl),
    originalUrl: remoteUrl,
  };
}
