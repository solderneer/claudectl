import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { AgentProgress, AgentStatus } from "../components/AgentProgress.js";
import {
  detectTerminal,
  getTerminalName,
  launchKittyTab,
  launchITermTab,
  type TerminalType,
} from "../lib/terminal/index.js";
import { getGitInfo, isGitRepo, cloneRepo, ensureGitignore, resetRepo, isValidGitRepo, GitError } from "../lib/git.js";
import { notifySpawnComplete } from "../lib/notifications.js";
import { pickAgentNames, isExistingAgent, getExistingAgents } from "../lib/names.js";

export interface SpawnCommandProps {
  count: number;
  terminal?: "kitty" | "iterm";
  branch?: string;
  notify: boolean;
  dryRun: boolean;
  clean: boolean;
}

interface AgentState {
  name: string;
  status: AgentStatus;
  isReused: boolean;
  error?: string;
}

async function findClaudeBinary(): Promise<string> {
  const locations = [
    join(process.env.HOME || "", ".claude/local/claude"),
    "/usr/local/bin/claude",
    "claude",
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  return "claude";
}

export function SpawnCommand({
  count,
  terminal,
  branch,
  notify,
  dryRun,
  clean,
}: SpawnCommandProps) {
  const { exit } = useApp();
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [terminalType, setTerminalType] = useState<TerminalType | null>(null);
  const [phase, setPhase] = useState<"init" | "spawning" | "done">("init");
  const [gitInfo, setGitInfo] = useState<{ remote: string; branch: string; root: string } | null>(null);
  const [reusedNames, setReusedNames] = useState<string[]>([]);

  // Initialize
  useEffect(() => {
    if (count < 1 || count > 10) {
      setError("Count must be between 1 and 10");
      return;
    }

    const init = async () => {
      try {
        if (!(await isGitRepo())) {
          setError("Not in a git repository");
          return;
        }

        const info = await getGitInfo();
        const targetBranch = branch || info.branch;
        setGitInfo({ ...info, branch: targetBranch });

        const detected = terminal || detectTerminal();
        if (detected === "unknown") {
          setError("Could not detect terminal. Use --terminal to specify kitty or iterm");
          return;
        }
        setTerminalType(detected as TerminalType);

        const claudeDir = join(info.root, "claude");

        // Pick agent names (prefers existing if not --clean)
        let names: string[];
        if (clean) {
          // For --clean, pick random names (existing will be deleted)
          const shuffled = ["alice", "betty", "clara", "diana", "emma", "felix", "grace", "henry", "iris", "james", "kate", "leo", "maya", "noah", "olive", "pearl", "quinn", "ruby", "sam", "tara"].sort(() => Math.random() - 0.5);
          names = shuffled.slice(0, count);
        } else {
          names = pickAgentNames(count, claudeDir);
        }

        // Determine which will be reused
        const reused = names.filter((n) => !clean && isExistingAgent(n, claudeDir));
        setReusedNames(reused);

        // Initialize agent states
        setAgents(
          names.map((name) => ({
            name,
            status: "pending" as AgentStatus,
            isReused: reused.includes(name),
          }))
        );

        if (dryRun) {
          setPhase("done");
          return;
        }

        setPhase("spawning");
      } catch (err) {
        if (err instanceof GitError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    init();
  }, [count, terminal, branch, dryRun, clean]);

  // Spawn agents
  useEffect(() => {
    if (phase !== "spawning" || !gitInfo || !terminalType || agents.length === 0) return;

    const spawn = async () => {
      const claudePath = await findClaudeBinary();
      const claudeDir = join(gitInfo.root, "claude");

      mkdirSync(claudeDir, { recursive: true });
      ensureGitignore(gitInfo.root, "claude/");

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const agentDir = join(claudeDir, agent.name);
        const willReuse = agent.isReused && !clean;

        // Update status
        setAgents((prev) =>
          prev.map((a, idx) =>
            idx === i ? { ...a, status: willReuse ? "resetting" : "cloning" } : a
          )
        );

        try {
          if (willReuse) {
            // Reset existing repo
            await resetRepo(agentDir, gitInfo.branch);
          } else {
            // Remove if exists (for --clean or non-matching)
            if (existsSync(agentDir)) {
              rmSync(agentDir, { recursive: true });
            }
            // Clone fresh
            await cloneRepo(gitInfo.remote, gitInfo.branch, agentDir);
          }

          // Update to launching
          setAgents((prev) =>
            prev.map((a, idx) =>
              idx === i ? { ...a, status: "launching" } : a
            )
          );

          // Launch terminal
          const launchOptions = {
            name: agent.name,
            cwd: agentDir,
            command: claudePath,
          };

          if (terminalType === "kitty") {
            await launchKittyTab(launchOptions);
          } else {
            await launchITermTab(launchOptions);
          }

          // Update to running
          setAgents((prev) =>
            prev.map((a, idx) =>
              idx === i ? { ...a, status: "running" } : a
            )
          );
        } catch (err) {
          setAgents((prev) =>
            prev.map((a, idx) =>
              idx === i
                ? { ...a, status: "error", error: err instanceof Error ? err.message : String(err) }
                : a
            )
          );
        }
      }

      if (notify) {
        await notifySpawnComplete(count);
      }

      setPhase("done");
    };

    spawn();
  }, [phase, gitInfo, terminalType, agents.length, count, notify, clean]);

  // Exit when done
  useEffect(() => {
    if (phase === "done" && !dryRun) {
      const timer = setTimeout(() => exit(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, dryRun, exit]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (dryRun && phase === "done") {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Dry run mode - no actions taken</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Would spawn {count} agent(s):</Text>
          <Text dimColor>  Terminal: {getTerminalName(terminalType || "unknown")}</Text>
          <Text dimColor>  Branch: {gitInfo?.branch || "current"}</Text>
          <Text dimColor>  Names: {agents.map((a) => a.name).join(", ")}</Text>
          {reusedNames.length > 0 && !clean && (
            <Text dimColor>  Reusing: {reusedNames.join(", ")}</Text>
          )}
          {clean && <Text dimColor>  Mode: Clean (fresh clones)</Text>}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {reusedNames.length > 0 && !clean && (
        <Box marginBottom={1}>
          <Text color="blue">Reusing existing agents: {reusedNames.join(", ")}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>
          Spawning <Text color="#D97757" bold>{count}</Text> Claude agent
          {count === 1 ? "" : "s"} in{" "}
          <Text color="cyan">{getTerminalName(terminalType || "unknown")}</Text>
        </Text>
      </Box>

      <Box flexDirection="column">
        {agents.map((agent) => (
          <AgentProgress
            key={agent.name}
            name={agent.name}
            status={agent.status}
            isReused={agent.isReused}
            error={agent.error}
          />
        ))}
      </Box>

      {phase === "done" && (
        <Box marginTop={1}>
          <Text color="green">All agents spawned successfully!</Text>
        </Box>
      )}
    </Box>
  );
}
