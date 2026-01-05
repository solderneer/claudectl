import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { getGitInfo, isGitRepo } from "../lib/git.js";
import { hashRemoteUrl } from "../lib/repo-hash.js";
import { listWorktrees, removeWorktree } from "../lib/worktree.js";
import {
  detectTerminal,
  getTerminalName,
  closeKittyTabs,
  closeITermSessions,
  type TerminalType,
} from "../lib/terminal/index.js";

export interface CleanCommandProps {
  force: boolean;
  terminal?: "kitty" | "iterm";
}

type CleanPhase = "checking" | "confirming" | "closing-tabs" | "cleaning" | "done" | "error";

interface AgentToClean {
  name: string;
  branch: string;
}

export function CleanCommand({ force, terminal }: CleanCommandProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<CleanPhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [agentsToClean, setAgentsToClean] = useState<AgentToClean[]>([]);
  const [repoHash, setRepoHash] = useState<string | null>(null);
  const [terminalType, setTerminalType] = useState<TerminalType | null>(null);
  const [tabsClosed, setTabsClosed] = useState(0);
  const [worktreesRemoved, setWorktreesRemoved] = useState(0);

  // Check what agents exist for current repo
  useEffect(() => {
    const check = async () => {
      try {
        if (!(await isGitRepo())) {
          setError("Not in a git repository");
          setPhase("error");
          return;
        }

        const info = await getGitInfo();
        const hash = hashRemoteUrl(info.remote);
        setRepoHash(hash);

        // Detect terminal
        const detected = terminal || detectTerminal();
        if (detected === "unknown") {
          setError("Could not detect terminal. Use --terminal to specify kitty or iterm");
          setPhase("error");
          return;
        }
        setTerminalType(detected as TerminalType);

        // Get agents for current repo
        const worktrees = await listWorktrees(hash);
        const agents: AgentToClean[] = worktrees.map((wt) => ({
          name: wt.name,
          branch: wt.branch,
        }));

        setAgentsToClean(agents);

        if (agents.length === 0) {
          setPhase("done");
          return;
        }

        if (force) {
          setPhase("closing-tabs");
        } else {
          setPhase("confirming");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };

    check();
  }, [force, terminal]);

  // Handle confirmation input
  useInput(
    (input, key) => {
      if (phase !== "confirming") return;

      if (input.toLowerCase() === "y" || key.return) {
        setPhase("closing-tabs");
      } else if (input.toLowerCase() === "n" || key.escape) {
        setError("Cancelled");
        setPhase("error");
      }
    },
    { isActive: phase === "confirming" }
  );

  // Close terminal tabs
  useEffect(() => {
    if (phase !== "closing-tabs" || !terminalType) return;

    const closeTabs = async () => {
      try {
        const agentNames = agentsToClean.map((a) => a.name);
        let closed = 0;

        if (terminalType === "kitty") {
          closed = await closeKittyTabs(agentNames);
        } else if (terminalType === "iterm") {
          closed = await closeITermSessions(agentNames);
        }

        setTabsClosed(closed);
        setPhase("cleaning");
      } catch {
        // Continue even if tab closing fails
        setPhase("cleaning");
      }
    };

    closeTabs();
  }, [phase, terminalType, agentsToClean]);

  // Clean up worktrees
  useEffect(() => {
    if (phase !== "cleaning" || !repoHash) return;

    const clean = async () => {
      try {
        let removed = 0;
        for (const agent of agentsToClean) {
          try {
            await removeWorktree(repoHash, agent.name);
            removed++;
            setWorktreesRemoved(removed);
          } catch {
            // Continue even if one fails
          }
        }

        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };

    clean();
  }, [phase, repoHash, agentsToClean]);

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
    return (
      <Box flexDirection="column">
        <Text>
          This will close terminal tabs and remove{" "}
          <Text color="red" bold>
            {agentsToClean.length}
          </Text>{" "}
          agent{agentsToClean.length === 1 ? "" : "s"}:
        </Text>
        <Box marginTop={1} flexDirection="column">
          {agentsToClean.slice(0, 10).map((agent) => (
            <Text key={agent.name} dimColor>
              - {agent.name} ({agent.branch})
            </Text>
          ))}
          {agentsToClean.length > 10 && (
            <Text dimColor>... and {agentsToClean.length - 10} more</Text>
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

  if (phase === "closing-tabs") {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          Closing terminal tabs in {getTerminalName(terminalType || "unknown")}...
        </Text>
      </Box>
    );
  }

  if (phase === "cleaning") {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          Removing worktrees... ({worktreesRemoved}/{agentsToClean.length})
        </Text>
      </Box>
    );
  }

  if (phase === "done") {
    if (agentsToClean.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No agents to clean.</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text color="green">
          Cleaned <Text bold>{worktreesRemoved}</Text> agent{worktreesRemoved === 1 ? "" : "s"}{" "}
          successfully.
        </Text>
        {tabsClosed > 0 && (
          <Text dimColor>
            Closed {tabsClosed} terminal tab{tabsClosed === 1 ? "" : "s"}.
          </Text>
        )}
      </Box>
    );
  }

  return null;
}
