import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { getGitInfo, isGitRepo } from "../lib/git.js";
import { hashRemoteUrl } from "../lib/repo-hash.js";
import { getReposDir, getWorktreesDir, getBareRepoPath } from "../lib/paths.js";
import { listWorktrees, type WorktreeInfo } from "../lib/worktree.js";

export interface ListCommandProps {
  all: boolean;
}

interface RepoAgents {
  repoHash: string;
  repoName: string;
  agents: WorktreeInfo[];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

async function getRepoNameFromBare(bareRepoPath: string): Promise<string> {
  try {
    const { execa } = await import("execa");
    const result = await execa("git", ["config", "--get", "remote.origin.url"], {
      cwd: bareRepoPath,
    });
    const url = result.stdout.trim();
    // Extract repo name from URL (e.g., git@github.com:user/repo.git -> user/repo)
    const match = url.match(/[/:]([\w-]+\/[\w.-]+?)(?:\.git)?$/);
    return match ? match[1] : url;
  } catch {
    return "unknown";
  }
}

export function ListCommand({ all }: ListCommandProps) {
  const { exit } = useApp();
  const [repos, setRepos] = useState<RepoAgents[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRepoHash, setCurrentRepoHash] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Get current repo hash if in a git repo
        if (await isGitRepo()) {
          const info = await getGitInfo();
          setCurrentRepoHash(hashRemoteUrl(info.remote));
        }

        const reposDir = getReposDir();
        if (!existsSync(reposDir)) {
          setRepos([]);
          setLoading(false);
          return;
        }

        const repoHashes = readdirSync(reposDir).filter((name) => {
          const repoPath = join(reposDir, name);
          return statSync(repoPath).isDirectory();
        });

        // If not --all, filter to current repo only
        let hashesToCheck = repoHashes;
        if (!all && currentRepoHash) {
          hashesToCheck = repoHashes.filter((h) => h === currentRepoHash);
        } else if (!all && !currentRepoHash) {
          // Not in a git repo and not using --all
          setError("Not in a git repository. Use --all to list all agents.");
          setLoading(false);
          return;
        }

        const repoAgentsList: RepoAgents[] = [];

        for (const hash of hashesToCheck) {
          const bareRepoPath = getBareRepoPath(hash);
          if (!existsSync(bareRepoPath)) continue;

          const worktrees = await listWorktrees(hash);
          if (worktrees.length === 0) continue;

          const repoName = await getRepoNameFromBare(bareRepoPath);

          // Get modification times for each worktree
          const worktreesDir = getWorktreesDir(hash);
          const agentsWithTime = worktrees.map((wt) => {
            try {
              const stat = statSync(join(worktreesDir, wt.name));
              return { ...wt, mtime: stat.mtime };
            } catch {
              return { ...wt, mtime: new Date(0) };
            }
          });

          // Sort by most recently modified
          agentsWithTime.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

          repoAgentsList.push({
            repoHash: hash,
            repoName,
            agents: agentsWithTime,
          });
        }

        setRepos(repoAgentsList);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    loadAgents();
  }, [all, currentRepoHash]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text dimColor>Loading agents...</Text>
      </Box>
    );
  }

  if (repos.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No agents found.</Text>
        <Text dimColor>Use 'claudectl spawn' to create new agents.</Text>
      </Box>
    );
  }

  const totalAgents = repos.reduce((sum, r) => sum + r.agents.length, 0);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          Found{" "}
          <Text color="#D97757" bold>
            {totalAgents}
          </Text>{" "}
          agent{totalAgents === 1 ? "" : "s"}
          {all ? " across all repositories" : ""}
        </Text>
      </Box>

      {repos.map((repo) => (
        <Box key={repo.repoHash} flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>
            {repo.repoName} <Text dimColor>({repo.repoHash})</Text>
          </Text>
          {repo.agents.map((agent) => {
            const wt = agent as WorktreeInfo & { mtime?: Date };
            const timeAgo = wt.mtime ? formatTimeAgo(wt.mtime) : "";
            return (
              <Box key={agent.name} marginLeft={2}>
                <Box width={12}>
                  <Text color="green">{agent.name}</Text>
                </Box>
                <Box width={30}>
                  <Text dimColor>{agent.branch}</Text>
                </Box>
                <Text dimColor>{timeAgo}</Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
