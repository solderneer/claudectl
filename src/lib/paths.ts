import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

/**
 * Get the root claudectl directory (~/.claudectl)
 */
export function getClaudectlRoot(): string {
  return join(homedir(), ".claudectl");
}

/**
 * Get the repos directory (~/.claudectl/repos)
 */
export function getReposDir(): string {
  return join(getClaudectlRoot(), "repos");
}

/**
 * Get the path for a specific repo by hash (~/.claudectl/repos/<hash>)
 */
export function getRepoPath(repoHash: string): string {
  return join(getReposDir(), repoHash);
}

/**
 * Get the bare repo path (~/.claudectl/repos/<hash>/bare)
 */
export function getBareRepoPath(repoHash: string): string {
  return join(getRepoPath(repoHash), "bare");
}

/**
 * Get the worktrees directory (~/.claudectl/repos/<hash>/worktrees)
 */
export function getWorktreesDir(repoHash: string): string {
  return join(getRepoPath(repoHash), "worktrees");
}

/**
 * Get a specific worktree path (~/.claudectl/repos/<hash>/worktrees/<name>)
 */
export function getWorktreePath(repoHash: string, agentName: string): string {
  return join(getWorktreesDir(repoHash), agentName);
}

/**
 * Get the queues directory (~/.claudectl/queues)
 */
export function getQueuesDir(): string {
  return join(getClaudectlRoot(), "queues");
}

/**
 * Get the queue file for a specific repo (~/.claudectl/queues/<hash>.json)
 */
export function getQueuePath(repoHash: string): string {
  return join(getQueuesDir(), `${repoHash}.json`);
}

/**
 * Get the IPC directory (~/.claudectl/ipc)
 */
export function getIpcDir(): string {
  return join(getClaudectlRoot(), "ipc");
}

/**
 * Get the IPC directory for a specific repo (~/.claudectl/ipc/<hash>)
 */
export function getRepoIpcDir(repoHash: string): string {
  return join(getIpcDir(), repoHash);
}

/**
 * Ensure all required claudectl directories exist
 */
export function ensureClaudectlDirs(): void {
  const dirs = [getClaudectlRoot(), getReposDir(), getQueuesDir(), getIpcDir()];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Ensure repo-specific directories exist
 */
export function ensureRepoDirs(repoHash: string): void {
  const dirs = [getRepoPath(repoHash), getWorktreesDir(repoHash)];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
