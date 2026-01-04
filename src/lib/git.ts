import { execa } from "execa";
import { existsSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

export interface GitInfo {
  remote: string;
  branch: string;
  root: string;
}

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

export async function getGitInfo(): Promise<GitInfo> {
  try {
    const [remoteResult, branchResult, rootResult] = await Promise.all([
      execa("git", ["remote", "get-url", "origin"]),
      execa("git", ["branch", "--show-current"]),
      execa("git", ["rev-parse", "--show-toplevel"]),
    ]);

    return {
      remote: remoteResult.stdout.trim(),
      branch: branchResult.stdout.trim(),
      root: rootResult.stdout.trim(),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("No such remote")) {
      throw new GitError("No remote 'origin' configured. Add a remote first.");
    }
    throw error;
  }
}

export async function isGitRepo(): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

export async function getGitRoot(): Promise<string> {
  const result = await execa("git", ["rev-parse", "--show-toplevel"]);
  return result.stdout.trim();
}

export async function cloneRepo(
  remote: string,
  branch: string,
  destination: string
): Promise<void> {
  await execa("git", ["clone", "-b", branch, remote, destination]);
}

export function ensureGitignore(root: string, pattern: string): boolean {
  const gitignorePath = join(root, ".gitignore");

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (content.includes(pattern)) {
      return false; // Already present
    }
  }

  appendFileSync(gitignorePath, `\n${pattern}\n`);
  return true;
}

/**
 * Reset an existing repo to a specific branch
 * Fetches, checks out, resets hard, and cleans untracked files
 */
export async function resetRepo(dir: string, branch: string): Promise<void> {
  await execa("git", ["fetch", "origin"], { cwd: dir });
  await execa("git", ["checkout", branch], { cwd: dir });
  await execa("git", ["reset", "--hard", `origin/${branch}`], { cwd: dir });
  await execa("git", ["clean", "-fd"], { cwd: dir });
}

/**
 * Check if a directory is a valid git repository
 */
export function isValidGitRepo(dir: string): boolean {
  return existsSync(dir) && existsSync(join(dir, ".git"));
}
