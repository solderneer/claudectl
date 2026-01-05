import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { getGitInfo, isGitRepo } from "../lib/git.js";
import { hashRemoteUrl } from "../lib/repo-hash.js";
import { removeWorktree, worktreeExists, listWorktrees } from "../lib/worktree.js";
import { isValidAgentName } from "../lib/names.js";

export interface DeleteCommandProps {
  agentName: string;
  force: boolean;
}

type DeletePhase = "checking" | "confirming" | "deleting" | "done" | "error";

export function DeleteCommand({ agentName, force }: DeleteCommandProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<DeletePhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [repoHash, setRepoHash] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  // Check if agent exists
  useEffect(() => {
    const check = async () => {
      try {
        if (!isValidAgentName(agentName)) {
          setError(`Invalid agent name: ${agentName}`);
          setPhase("error");
          return;
        }

        if (!(await isGitRepo())) {
          setError("Not in a git repository");
          setPhase("error");
          return;
        }

        const info = await getGitInfo();
        const hash = hashRemoteUrl(info.remote);
        setRepoHash(hash);

        const exists = await worktreeExists(hash, agentName);
        if (!exists) {
          setError(`Agent '${agentName}' does not exist`);
          setPhase("error");
          return;
        }

        // Get the branch name for display
        const worktrees = await listWorktrees(hash);
        const agent = worktrees.find((wt) => wt.name === agentName);
        if (agent) {
          setBranch(agent.branch);
        }

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
  }, [agentName, force]);

  // Handle confirmation input
  useInput(
    (input, key) => {
      if (phase !== "confirming") return;

      if (input.toLowerCase() === "y" || key.return) {
        setPhase("deleting");
      } else if (input.toLowerCase() === "n" || key.escape) {
        setError("Cancelled");
        setPhase("error");
      }
    },
    { isActive: phase === "confirming" }
  );

  // Delete the agent
  useEffect(() => {
    if (phase !== "deleting" || !repoHash) return;

    const deleteAgent = async () => {
      try {
        await removeWorktree(repoHash, agentName);
        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };

    deleteAgent();
  }, [phase, repoHash, agentName]);

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
        <Text dimColor>Checking agent...</Text>
      </Box>
    );
  }

  if (phase === "confirming") {
    return (
      <Box flexDirection="column">
        <Text>
          Delete agent{" "}
          <Text color="green" bold>
            {agentName}
          </Text>
          {branch && <Text dimColor> on branch {branch}</Text>}?
        </Text>
        <Text dimColor>This will remove the worktree and cannot be undone.</Text>
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
        <Text color="yellow">Deleting agent {agentName}...</Text>
      </Box>
    );
  }

  if (phase === "done") {
    return (
      <Box flexDirection="column">
        <Text color="green">
          Agent <Text bold>{agentName}</Text> deleted successfully.
        </Text>
      </Box>
    );
  }

  return null;
}
