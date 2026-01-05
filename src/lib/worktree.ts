import { execa } from "execa";
import { existsSync, rmSync } from "fs";
import { getBareRepoPath, getWorktreePath, getWorktreesDir, ensureRepoDirs } from "./paths.js";

/**
 * Information about a git worktree
 */
export interface WorktreeInfo {
  name: string;
  path: string;
  branch: string;
  commit: string;
}

/**
 * Options for creating a worktree
 */
export interface CreateWorktreeOptions {
  repoHash: string;
  agentName: string;
  branchName: string;
  baseBranch?: string;
}

/**
 * Error class for worktree operations
 */
export class WorktreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorktreeError";
  }
}

/**
 * Get the default branch of a repository (main or master)
 */
export async function getDefaultBranch(bareRepoPath: string): Promise<string> {
  try {
    // Try to get the default branch from remote HEAD
    const result = await execa("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], {
      cwd: bareRepoPath,
    });
    // Output is like "refs/remotes/origin/main"
    const branch = result.stdout.trim().replace("refs/remotes/origin/", "");
    return branch;
  } catch {
    // Fallback: check if main exists, otherwise master
    try {
      await execa("git", ["rev-parse", "--verify", "refs/heads/main"], {
        cwd: bareRepoPath,
      });
      return "main";
    } catch {
      return "master";
    }
  }
}

/**
 * Ensure the bare repository exists, cloning if necessary.
 * Returns the path to the bare repo.
 */
export async function ensureBareRepo(remoteUrl: string, repoHash: string): Promise<string> {
  ensureRepoDirs(repoHash);
  const bareRepoPath = getBareRepoPath(repoHash);

  if (!existsSync(bareRepoPath)) {
    // Clone as bare repository
    await execa("git", ["clone", "--bare", remoteUrl, bareRepoPath]);

    // Set up remote HEAD tracking
    try {
      await execa("git", ["remote", "set-head", "origin", "--auto"], {
        cwd: bareRepoPath,
      });
    } catch {
      // Ignore if this fails - not critical
    }
  } else {
    // Fetch latest changes
    // Use refs/remotes/origin/* to avoid conflicts with branches checked out in worktrees
    // Git refuses to fetch into branches that are currently checked out
    await execa("git", ["fetch", "origin", "+refs/heads/*:refs/remotes/origin/*", "--prune"], {
      cwd: bareRepoPath,
    });
  }

  return bareRepoPath;
}

/**
 * Create a new worktree for an agent.
 * Creates a new branch based on the base branch.
 */
export async function createWorktree(options: CreateWorktreeOptions): Promise<string> {
  const { repoHash, agentName, branchName, baseBranch } = options;
  const bareRepoPath = getBareRepoPath(repoHash);
  const worktreePath = getWorktreePath(repoHash, agentName);

  if (!existsSync(bareRepoPath)) {
    throw new WorktreeError(`Bare repo does not exist at ${bareRepoPath}`);
  }

  // Remove existing worktree if present
  if (existsSync(worktreePath)) {
    await removeWorktree(repoHash, agentName);
  }

  // Determine base branch
  const base = baseBranch || (await getDefaultBranch(bareRepoPath));

  // Check if branch already exists
  let branchExists = false;
  try {
    await execa("git", ["rev-parse", "--verify", `refs/heads/${branchName}`], {
      cwd: bareRepoPath,
    });
    branchExists = true;
  } catch {
    branchExists = false;
  }

  if (branchExists) {
    // Use existing branch
    await execa("git", ["worktree", "add", worktreePath, branchName], {
      cwd: bareRepoPath,
    });
  } else {
    // Create new branch from base
    // We fetch to refs/remotes/origin/*, so use that as the base ref
    // Fall back to refs/heads if the remote ref doesn't exist (freshly cloned bare repo)
    let baseRef = `refs/remotes/origin/${base}`;
    try {
      await execa("git", ["rev-parse", "--verify", baseRef], {
        cwd: bareRepoPath,
      });
    } catch {
      // Fall back to local branch (initial clone populates refs/heads directly)
      baseRef = base;
    }

    await execa("git", ["worktree", "add", "-b", branchName, worktreePath, baseRef], {
      cwd: bareRepoPath,
    });
  }

  return worktreePath;
}

/**
 * Remove a worktree and clean up
 */
export async function removeWorktree(repoHash: string, agentName: string): Promise<void> {
  const bareRepoPath = getBareRepoPath(repoHash);
  const worktreePath = getWorktreePath(repoHash, agentName);

  if (existsSync(worktreePath)) {
    try {
      // Try graceful removal first
      await execa("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: bareRepoPath,
      });
    } catch {
      // If git worktree remove fails, manually remove and prune
      rmSync(worktreePath, { recursive: true, force: true });
      await execa("git", ["worktree", "prune"], { cwd: bareRepoPath });
    }
  }
}

/**
 * List all worktrees for a repository
 */
export async function listWorktrees(repoHash: string): Promise<WorktreeInfo[]> {
  const bareRepoPath = getBareRepoPath(repoHash);
  const worktreesDir = getWorktreesDir(repoHash);

  if (!existsSync(bareRepoPath)) {
    return [];
  }

  try {
    const result = await execa("git", ["worktree", "list", "--porcelain"], {
      cwd: bareRepoPath,
    });

    const worktrees: WorktreeInfo[] = [];
    const lines = result.stdout.split("\n");

    let currentWorktree: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        currentWorktree.path = line.replace("worktree ", "");
      } else if (line.startsWith("HEAD ")) {
        currentWorktree.commit = line.replace("HEAD ", "").slice(0, 8);
      } else if (line.startsWith("branch ")) {
        currentWorktree.branch = line.replace("branch refs/heads/", "");
      } else if (line === "") {
        // End of worktree entry
        if (currentWorktree.path && currentWorktree.path.startsWith(worktreesDir)) {
          // Extract agent name from path
          const name = currentWorktree.path.replace(worktreesDir + "/", "");
          worktrees.push({
            name,
            path: currentWorktree.path,
            branch: currentWorktree.branch || "unknown",
            commit: currentWorktree.commit || "unknown",
          });
        }
        currentWorktree = {};
      }
    }

    return worktrees;
  } catch {
    return [];
  }
}

/**
 * Check if a worktree exists for an agent
 */
export async function worktreeExists(repoHash: string, agentName: string): Promise<boolean> {
  const worktreePath = getWorktreePath(repoHash, agentName);
  return existsSync(worktreePath);
}

/**
 * Reset a worktree to the latest state of a branch
 */
export async function resetWorktree(
  repoHash: string,
  agentName: string,
  targetBranch: string
): Promise<void> {
  const worktreePath = getWorktreePath(repoHash, agentName);

  if (!existsSync(worktreePath)) {
    throw new WorktreeError(`Worktree does not exist at ${worktreePath}`);
  }

  // Fetch latest from origin
  await execa("git", ["fetch", "origin"], { cwd: worktreePath });

  // Reset to the target branch
  await execa("git", ["checkout", targetBranch], { cwd: worktreePath });
  await execa("git", ["reset", "--hard", `origin/${targetBranch}`], { cwd: worktreePath });
  await execa("git", ["clean", "-fd"], { cwd: worktreePath });
}

/**
 * Get existing agent names from worktrees
 */
export async function getExistingAgentNames(repoHash: string): Promise<string[]> {
  const worktrees = await listWorktrees(repoHash);
  return worktrees.map((wt) => wt.name);
}

/**
 * Switch an existing worktree to a new branch
 * Creates the branch from baseBranch if it doesn't exist
 */
export async function switchWorktreeBranch(
  repoHash: string,
  agentName: string,
  newBranchName: string,
  baseBranch: string
): Promise<void> {
  const worktreePath = getWorktreePath(repoHash, agentName);

  if (!existsSync(worktreePath)) {
    throw new WorktreeError(`Worktree does not exist at ${worktreePath}`);
  }

  // Fetch latest from origin
  await execa("git", ["fetch", "origin"], { cwd: worktreePath });

  // Check if branch already exists locally
  let branchExists = false;
  try {
    await execa("git", ["rev-parse", "--verify", `refs/heads/${newBranchName}`], {
      cwd: worktreePath,
    });
    branchExists = true;
  } catch {
    branchExists = false;
  }

  if (branchExists) {
    // Switch to existing branch
    await execa("git", ["checkout", newBranchName], { cwd: worktreePath });
  } else {
    // Create new branch from base and switch to it
    await execa("git", ["checkout", "-b", newBranchName, `origin/${baseBranch}`], {
      cwd: worktreePath,
    });
  }
}
