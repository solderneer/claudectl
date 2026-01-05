import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { readdirSync, existsSync, rmSync, statSync } from "fs";
import { join } from "path";
import { getGitInfo, isGitRepo } from "../lib/git.js";
import { hashRemoteUrl } from "../lib/repo-hash.js";
import { getReposDir, getWorktreesDir, getRepoPath } from "../lib/paths.js";
import { listWorktrees, removeWorktree } from "../lib/worktree.js";

export interface PruneCommandProps {
  all: boolean;
  force: boolean;
}

type PrunePhase = "checking" | "confirming" | "deleting" | "done" | "error";

interface AgentToDelete {
  repoHash: string;
  agentName: string;
}

export function PruneCommand({ all, force }: PruneCommandProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<PrunePhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [agentsToDelete, setAgentsToDelete] = useState<AgentToDelete[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);

  // Check what agents exist
  useEffect(() => {
    const check = async () => {
      try {
        const reposDir = getReposDir();
        if (!existsSync(reposDir)) {
          setAgentsToDelete([]);
          if (force) {
            setPhase("done");
          } else {
            setPhase("confirming");
          }
          return;
        }

        // Determine which repos to check
        let hashesToCheck: string[] = [];

        if (all) {
          hashesToCheck = readdirSync(reposDir).filter((name) => {
            const repoPath = join(reposDir, name);
            return statSync(repoPath).isDirectory();
          });
        } else {
          if (!(await isGitRepo())) {
            setError("Not in a git repository. Use --all to prune all agents.");
            setPhase("error");
            return;
          }
          const info = await getGitInfo();
          const hash = hashRemoteUrl(info.remote);
          hashesToCheck = [hash];
        }

        // Collect all agents to delete
        const agents: AgentToDelete[] = [];

        for (const hash of hashesToCheck) {
          const worktrees = await listWorktrees(hash);
          for (const wt of worktrees) {
            agents.push({ repoHash: hash, agentName: wt.name });
          }
        }

        setAgentsToDelete(agents);

        if (force) {
          setPhase("deleting");
        } else {
          setPhase("confirming");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };

    check();
  }, [all, force]);

  // Handle confirmation input
  useInput(
    (input, key) => {
      if (phase !== "confirming") return;

      if (input.toLowerCase() === "y" || key.return) {
        if (agentsToDelete.length > 0) {
          setPhase("deleting");
        } else {
          setPhase("done");
        }
      } else if (input.toLowerCase() === "n" || key.escape) {
        setError("Cancelled");
        setPhase("error");
      }
    },
    { isActive: phase === "confirming" }
  );

  // Delete agents
  useEffect(() => {
    if (phase !== "deleting") {
      return;
    }

    if (agentsToDelete.length === 0) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(timer);
    }

    const deleteAgents = async () => {
      try {
        let deleted = 0;
        for (const agent of agentsToDelete) {
          try {
            await removeWorktree(agent.repoHash, agent.agentName);
            deleted++;
            setDeletedCount(deleted);
          } catch {
            // Continue even if one fails
          }
        }

        // Clean up empty repo directories if --all
        if (all) {
          const reposDir = getReposDir();
          if (existsSync(reposDir)) {
            const repoHashes = readdirSync(reposDir);
            for (const hash of repoHashes) {
              const repoPath = getRepoPath(hash);
              const worktreesDir = getWorktreesDir(hash);

              // Check if worktrees directory is empty
              if (existsSync(worktreesDir)) {
                const remaining = readdirSync(worktreesDir);
                if (remaining.length === 0) {
                  // Remove the entire repo directory
                  rmSync(repoPath, { recursive: true, force: true });
                }
              }
            }
          }
        }

        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };

    deleteAgents();
  }, [phase, agentsToDelete, all]);

  // Exit when done or error
  useEffect(() => {
    if (phase === "done" || phase === "error") {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [phase, exit]);

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (phase === "checking") {
    return (
      <Box flexDirection="column">
        <Text dimColor>Checking agents...</Text>
      </Box>
    );
  }

  if (phase === "confirming") {
    if (agentsToDelete.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No agents to prune.</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text>
          This will delete{" "}
          <Text color="red" bold>
            {agentsToDelete.length}
          </Text>{" "}
          agent{agentsToDelete.length === 1 ? "" : "s"}
          {all ? " across all repositories" : ""}:
        </Text>
        <Box marginTop={1} flexDirection="column">
          {agentsToDelete.slice(0, 10).map((agent) => (
            <Text key={`${agent.repoHash}-${agent.agentName}`} dimColor>
              - {agent.agentName} ({agent.repoHash})
            </Text>
          ))}
          {agentsToDelete.length > 10 && (
            <Text dimColor>... and {agentsToDelete.length - 10} more</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text>
            Press <Text color="green">Y</Text> to confirm or <Text color="red">N</Text> to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  if (phase === "deleting") {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          Deleting agents... ({deletedCount}/{agentsToDelete.length})
        </Text>
      </Box>
    );
  }

  if (phase === "done") {
    if (agentsToDelete.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No agents to prune.</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text color="green">
          Deleted <Text bold>{deletedCount}</Text> agent{deletedCount === 1 ? "" : "s"}{" "}
          successfully.
        </Text>
      </Box>
    );
  }

  return null;
}
